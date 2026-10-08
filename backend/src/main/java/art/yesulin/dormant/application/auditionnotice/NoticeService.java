package art.yesulin.dormant.application.auditionnotice;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.dormant.domain.audition.schedule.ScreeningStage;
import art.yesulin.dormant.domain.auditionnotice.NoticeError;
import art.yesulin.dormant.domain.auditionnotice.NoticeMessage;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(isolation = Isolation.READ_COMMITTED)
public class NoticeService {

    private final NoticeAudience audience;
    private final NoticeStore store;
    private final NoticeSettings settings;
    private final ObjectMapper mapper;
    private final Clock clock;

    public Metadata metadata(long ownerId, NoticeScope scope, int round) {
        NoticeAudience.Context context = audience.load(ownerId, scope, round);
        ScreeningStage next = round < context.stages().size() ? context.stages().get(round) : null;
        return new Metadata(settings.enabled() && settings.configured(), settings.sender(), context.footer(),
                context.messageHeader(),
                next == null ? null : next.getId(), next == null ? "별도 일정 안내" : next.getName(),
                next == null ? null : next.getDate(), settings.requestLimit(),
                context.candidates());
    }

    public Preview preview(long ownerId, NoticeScope scope, int round, NoticeCommand command) {
        validateShape(command);
        NoticeAudience.Context context = audience.load(ownerId, scope, round);
        ScreeningStage target = context.target(command.targetStageId());
        List<PreviewRecipient> result = new ArrayList<>();
        HashSet<String> phones = new HashSet<>();
        List<String> warnings = new ArrayList<>();
        for (NoticeCommand.Recipient recipient : command.recipients()) {
            try {
                Candidate basic = context.passed(recipient.submissionId());
                NoticeMessage message = NoticeMessage.create(basic.name(), basic.phone(), recipient.appointment(),
                        command.template(), context.messageHeader(), context.footer(), clock);
                if (!phones.add(message.phone())) {
                    warnings.add("같은 수신번호가 여러 지원서에 있습니다. 각각 문자가 발송됩니다.");
                }
                if (target != null && !target.getDate().equals(recipient.appointment().toLocalDate())) {
                    warnings.add("전형 날짜와 다른 오디션 일시가 있습니다.");
                }
                result.add(new PreviewRecipient(recipient.submissionId(), basic.name(), message.phone(),
                        recipient.appointment(), message.body(), message.type(), message.bytes(),
                        settings.configured() ? settings.price(message.type()) : null, null));
            } catch (IllegalArgumentException exception) {
                result.add(new PreviewRecipient(recipient.submissionId(), null, null, recipient.appointment(),
                        null, null, 0, null, exception.getMessage()));
            }
        }
        BigDecimal total = settings.configured() ? result.stream().filter(r -> r.price() != null)
                .map(PreviewRecipient::price).reduce(BigDecimal.ZERO, BigDecimal::add) : null;
        String token = hash(mapper.writeValueAsString(result) + settings.sender());
        return new Preview(result, warnings.stream().distinct().toList(), total, settings.sender(), token,
                result.stream().allMatch(r -> r.error() == null) && settings.configured() && settings.enabled());
    }

    public NoticeStore.Batch send(long ownerId, NoticeScope scope, int round, UUID key,
                                 NoticeCommand command, String previewToken) {
        validateShape(command);
        store.lock();
        String fingerprint = fingerprint(scope, round, command);
        NoticeStore.Batch previous = store.byKey(ownerId, key).orElse(null);
        if (previous != null) {
            assertSame(previous.fingerprint(), fingerprint);
            audience.load(ownerId, scope, round);
            return previous;
        }
        requireEnabled();
        Preview preview = preview(ownerId, scope, round, command);
        if (!preview.sendable() || !preview.token().equals(previewToken)) {
            throw new BusinessException(NoticeError.CONFLICT,
                    "발송 내용이나 설정이 변경되었거나 입력 오류가 있습니다. 다시 미리보기해 주세요.");
        }
        NoticeAudience.Context context = audience.load(ownerId, scope, round);
        reserve(command.recipients().size());
        UUID id = UUID.randomUUID();
        NoticeStore.Batch batch = new NoticeStore.Batch(id, ownerId, scope.roleId(), round,
                context.sourceStageId(), command.targetStageId(), key, fingerprint,
                settings.sender(), clock.instant(), null, preview.total(), command.recipients().size(), scope.key());
        List<NoticeStore.Delivery> deliveries = preview.recipients().stream().map(r -> new NoticeStore.Delivery(
                UUID.randomUUID(), id, r.submissionId(), r.name(), r.phone(), r.appointment(), r.body(), r.type(),
                r.price(), "QUEUED", null, null, clock.instant())).toList();
        store.insert(batch, deliveries);
        store.deleteDraft(ownerId, scope, round);
        return batch;
    }

    public List<NoticeStore.HistoryItem> history(long ownerId, NoticeScope scope, int round) {
        audience.load(ownerId, scope, round);
        return store.history(ownerId, scope, round);
    }

    public Detail detail(long ownerId, NoticeScope scope, int round, UUID id) {
        audience.load(ownerId, scope, round);
        NoticeStore.Batch batch = store.batch(id).filter(b -> b.ownerId() == ownerId && b.roleId() == scope.roleId()
                && b.scopeKey().equals(scope.key())
                && b.sourceRound() == round).orElseThrow(() -> new BusinessException(NoticeError.NOT_FOUND,
                "발송 내역을 찾을 수 없습니다."));
        return new Detail(batch, store.deliveries(id));
    }

    public DraftResult draft(long ownerId, NoticeScope scope, int round) {
        audience.load(ownerId, scope, round);
        return store.draft(ownerId, scope, round)
                .filter(d -> d.updatedAt().isAfter(clock.instant().minusSeconds(30L * 86400)))
                .map(d -> new DraftResult(d.version(), mapper.readValue(d.payload(), NoticeCommand.class)))
                .orElse(new DraftResult(0, null));
    }

    public Preview retryPreview(long ownerId, NoticeScope scope, int round, UUID originalId, List<UUID> ids) {
        Detail original = detail(ownerId, scope, round, originalId);
        if (ids == null || ids.isEmpty() || ids.size() > 500 || new HashSet<>(ids).size() != ids.size()) {
            throw new IllegalArgumentException("재발송할 확정 실패 대상을 선택해 주세요.");
        }
        NoticeAudience.Context context = audience.load(ownerId, scope, round);
        List<NoticeStore.Delivery> selected = original.deliveries().stream().filter(d -> ids.contains(d.id())).toList();
        if (selected.size() != ids.size()) {
            throw new IllegalArgumentException("삭제되거나 만료된 발송 대상입니다.");
        }
        List<PreviewRecipient> rows = new ArrayList<>();
        for (NoticeStore.Delivery d : selected) {
            context.passed(d.submissionId());
            if (!d.status().equals("FAILED") || "RETRIED".equals(d.code())
                    || !d.appointment().atZone(NoticeMessage.ZONE).toInstant().isAfter(clock.instant())) {
                throw new IllegalArgumentException("아직 재발송하지 않은 확정 실패와 미래 일정만 재발송할 수 있습니다.");
            }
            rows.add(new PreviewRecipient(d.submissionId(), d.name(), d.phone(), d.appointment(), d.body(),
                    d.type(), d.body().getBytes(java.nio.charset.Charset.forName("EUC-KR")).length,
                    settings.configured() ? settings.price(d.type()) : null, null));
        }
        BigDecimal total = settings.configured() ? rows.stream().map(PreviewRecipient::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add) : null;
        return new Preview(rows, List.of("이전 문구·일시 그대로 다시 발송합니다. 수신자와 내용을 확인해 주세요."), total,
                settings.sender(), hash(mapper.writeValueAsString(rows) + settings.sender()),
                settings.enabled() && settings.configured());
    }

    public NoticeStore.Batch retry(long ownerId, NoticeScope scope, int round, UUID originalId, UUID key,
                                   List<UUID> ids, String token) {
        store.lock();
        String fingerprint = hash("retry:" + scopePrefix(scope) + scope.roleId() + ":" + round + ":"
                + originalId + ":" + mapper.writeValueAsString(
                ids == null ? null : ids.stream().sorted().toList()));
        NoticeStore.Batch previous = store.byKey(ownerId, key).orElse(null);
        if (previous != null) {
            assertSame(previous.fingerprint(), fingerprint);
            audience.load(ownerId, scope, round);
            return previous;
        }
        requireEnabled();
        Preview preview = retryPreview(ownerId, scope, round, originalId, ids);
        if (!preview.token().equals(token)) {
            throw new BusinessException(NoticeError.CONFLICT, "재발송 내용을 다시 미리보기해 주세요.");
        }
        NoticeStore.Batch original = detail(ownerId, scope, round, originalId).batch();
        reserve(ids.size());
        UUID id = UUID.randomUUID();
        NoticeStore.Batch batch = new NoticeStore.Batch(id, ownerId, scope.roleId(), round, original.sourceStageId(),
                original.targetStageId(), key, fingerprint, settings.sender(), clock.instant(), originalId,
                preview.total(), ids.size(), scope.key());
        store.insert(batch, preview.recipients().stream().map(r -> new NoticeStore.Delivery(UUID.randomUUID(), id,
                r.submissionId(), r.name(), r.phone(), r.appointment(), r.body(), r.type(), r.price(),
                "QUEUED", null, null, clock.instant())).toList());
        store.markRetried(ids);
        return batch;
    }

    public DraftResult saveDraft(long ownerId, NoticeScope scope, int round, long version, NoticeCommand command) {
        validateShape(command);
        store.lock();
        NoticeAudience.Context context = audience.load(ownerId, scope, round);
        for (NoticeCommand.Recipient recipient : command.recipients()) {
            context.passed(recipient.submissionId());
        }
        long existing = store.draft(ownerId, scope, round)
                .filter(d -> d.updatedAt().isAfter(clock.instant().minusSeconds(30L * 86400)))
                .map(NoticeStore.Draft::version).orElse(0L);
        if (existing != version) {
            throw new BusinessException(NoticeError.CONFLICT, "다른 창에서 초안이 변경됐습니다. 다시 불러와 주세요.");
        }
        store.saveDraft(ownerId, scope, round, new NoticeStore.Draft(version + 1,
                mapper.writeValueAsString(command), clock.instant()));
        return new DraftResult(version + 1, command);
    }

    private void reserve(int count) {
        if (count > settings.requestLimit() || store.reserve(LocalDate.now(clock.withZone(NoticeMessage.ZONE)),
                count, settings.dailyLimit()) < 0) {
            throw new BusinessException(NoticeError.LIMIT_EXCEEDED, "요청 또는 일일 발송 한도를 초과했습니다.");
        }
    }

    private void requireEnabled() {
        if (!settings.enabled() || !settings.configured()) {
            throw new BusinessException(NoticeError.DISABLED, "문자 발송 설정이 준비되지 않았습니다. 발송되지 않습니다.");
        }
    }

    private void validateShape(NoticeCommand command) {
        if (command == null || command.recipients() == null || command.recipients().isEmpty()
                || command.recipients().size() > 500 || command.template() == null
                || command.template().length() > 2000) {
            throw new IllegalArgumentException("1~500명의 대상과 2,000자 이내 안내문을 입력해 주세요.");
        }
        HashSet<UUID> ids = new HashSet<>();
        for (NoticeCommand.Recipient recipient : command.recipients()) {
            if (recipient == null || recipient.submissionId() == null || !ids.add(recipient.submissionId())) {
                throw new IllegalArgumentException("지원서 ID가 누락되었거나 중복되었습니다.");
            }
        }
    }

    private String fingerprint(NoticeScope scope, int round, NoticeCommand command) {
        List<NoticeCommand.Recipient> sorted = command.recipients().stream()
                .sorted(Comparator.comparing(r -> r.submissionId().toString())).toList();
        return hash(scopePrefix(scope) + scope.roleId() + ":" + round + ":" + mapper.writeValueAsString(
                new NoticeCommand(command.targetStageId(), command.template(), sorted)));
    }

    private String scopePrefix(NoticeScope scope) {
        return scope.otrAuditionId() == null ? "" : scope.key() + ":";
    }

    private void assertSame(String existing, String requested) {
        if (!existing.equals(requested)) {
            throw new BusinessException(NoticeError.CONFLICT, "같은 발송 키로 다른 내용을 보낼 수 없습니다.");
        }
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }

    public record Metadata(boolean enabled, String sender, String footer, String messageHeader, Long targetStageId,
                           String targetName, LocalDate targetDate, int requestLimit, List<Candidate> candidates) {
    }

    public record Candidate(UUID submissionId, String name, String phone) {
    }

    public record PreviewRecipient(UUID submissionId, String name, String phone, java.time.LocalDateTime appointment,
                                   String body, String type, int bytes, BigDecimal price, String error) {
    }

    public record Preview(List<PreviewRecipient> recipients, List<String> warnings, BigDecimal total,
                          String sender, String token, boolean sendable) {
    }

    public record Detail(NoticeStore.Batch batch, List<NoticeStore.Delivery> deliveries) {
    }

    public record DraftResult(long version, NoticeCommand command) {
    }
}
