package art.yesulin.application.admin;

import static art.yesulin.domain.admin.AdminErrorCode.DELETION_CONFIRMATION_FAILED;

import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.common.exception.BusinessException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdminDeletionConfirmation {

    private static final String FAILURE_MESSAGE = "삭제 확인 비밀번호가 올바르지 않습니다.";
    private static final Duration WINDOW = Duration.ofMinutes(10);
    private static final int MAX_FAILURES = 5;
    private static final Logger LOGGER = LoggerFactory.getLogger(AdminDeletionConfirmation.class);

    private final PasswordEncoder passwordEncoder;
    private final String encodedPassword;
    private final Clock clock;
    // 인증된 관리자만 진입한다. compute로 같은 계정의 확인과 상태 갱신을 원자적으로 처리한다.
    private final ConcurrentHashMap<Long, AttemptState> attempts = new ConcurrentHashMap<>();

    public AdminDeletionConfirmation(
            PasswordEncoder passwordEncoder,
            @Value("${yesulin.admin.deletion-password-hash:}") String encodedPassword,
            Clock clock
    ) {
        this.passwordEncoder = passwordEncoder;
        this.encodedPassword = encodedPassword;
        this.clock = clock;
    }

    public void verify(long actorMemberId, String rawPassword) {
        Instant cleanupTime = clock.instant();
        attempts.entrySet().removeIf(entry -> entry.getValue().expiredAt(cleanupTime));
        AttemptState result = attempts.compute(actorMemberId, (memberId, previous) -> {
            Instant now = clock.instant();
            if (previous != null && previous.lockedUntil().isAfter(now)) {
                return previous;
            }
            if (matches(rawPassword)) {
                return new AttemptState(List.of(), Instant.MIN, Outcome.VERIFIED);
            }
            List<Instant> failures = new ArrayList<>();
            if (previous != null) {
                previous.failedAt().stream().filter(time -> time.isAfter(now.minus(WINDOW))).forEach(failures::add);
            }
            failures.add(now);
            if (failures.size() >= MAX_FAILURES) {
                return new AttemptState(List.copyOf(failures), now.plus(WINDOW), Outcome.LOCKED);
            }
            return new AttemptState(List.copyOf(failures), Instant.MIN, Outcome.REJECTED);
        });

        Optional<BusinessException> failure = switch (result.outcome()) {
            case VERIFIED -> Optional.empty();
            case REJECTED -> Optional.of(new BusinessException(DELETION_CONFIRMATION_FAILED, FAILURE_MESSAGE));
            case LOCKED -> {
                Duration remaining = Duration.between(clock.instant(), result.lockedUntil());
                long seconds = Math.max(1, (remaining.toMillis() + 999) / 1000);
                yield Optional.of(new BusinessException(DELETION_CONFIRMATION_FAILED,
                        "반복 입력 실패로 삭제 확인이 잠겨 있습니다. %d초 후 다시 시도해 주세요.".formatted(seconds)));
            }
        };
        failure.ifPresent(exception -> {
            LOGGER.warn("ADMIN_DELETION_CONFIRMATION actorMemberId={} outcome={}", actorMemberId, result.outcome());
            throw exception;
        });
        attempts.remove(actorMemberId, result);
    }

    private boolean matches(String rawPassword) {
        if (rawPassword == null || rawPassword.isBlank() || encodedPassword.isBlank()
                || rawPassword.length() > 128 || rawPassword.getBytes(StandardCharsets.UTF_8).length > 72) {
            return false;
        }
        try {
            return passwordEncoder.matches(rawPassword, encodedPassword);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private enum Outcome {
        VERIFIED, REJECTED, LOCKED
    }

    private record AttemptState(List<Instant> failedAt, Instant lockedUntil, Outcome outcome) {

        boolean expiredAt(Instant now) {
            return !lockedUntil.isAfter(now) && failedAt.stream().noneMatch(time -> time.isAfter(now.minus(WINDOW)));
        }
    }
}
