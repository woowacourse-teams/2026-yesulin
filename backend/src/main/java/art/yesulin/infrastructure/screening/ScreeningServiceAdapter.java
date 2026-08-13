package art.yesulin.infrastructure.screening;

import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningException;
import art.yesulin.application.screening.ScreeningReviewCommand;
import art.yesulin.application.screening.ScreeningService;
import art.yesulin.infrastructure.application.ApplicationAnswerJpaEntity;
import art.yesulin.infrastructure.application.ApplicationAnswerJpaRepository;
import art.yesulin.infrastructure.application.ApplicationJpaEntity;
import art.yesulin.infrastructure.application.ApplicationJpaRepository;
import art.yesulin.infrastructure.recruitment.PerformanceJpaEntity;
import art.yesulin.infrastructure.recruitment.PerformanceJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import art.yesulin.infrastructure.recruitment.RoleJpaEntity;
import art.yesulin.infrastructure.recruitment.RoleJpaRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class ScreeningServiceAdapter implements ScreeningService {

    private static final Set<String> STATUSES =
            Set.of("PENDING", "PASS", "FAIL", "ABSENT", "ETC");

    private final RoleJpaRepository roleRepository;
    private final PostingJpaRepository postingRepository;
    private final PerformanceJpaRepository performanceRepository;
    private final ScreeningRoundJpaRepository roundRepository;
    private final ApplicationReviewJpaRepository reviewRepository;
    private final ApplicationJpaRepository applicationRepository;
    private final ApplicationAnswerJpaRepository answerRepository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public ScreeningServiceAdapter(
            RoleJpaRepository roleRepository,
            PostingJpaRepository postingRepository,
            PerformanceJpaRepository performanceRepository,
            ScreeningRoundJpaRepository roundRepository,
            ApplicationReviewJpaRepository reviewRepository,
            ApplicationJpaRepository applicationRepository,
            ApplicationAnswerJpaRepository answerRepository,
            ObjectMapper objectMapper,
            Clock clock) {
        this.roleRepository = roleRepository;
        this.postingRepository = postingRepository;
        this.performanceRepository = performanceRepository;
        this.roundRepository = roundRepository;
        this.reviewRepository = reviewRepository;
        this.applicationRepository = applicationRepository;
        this.answerRepository = answerRepository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    @Override
    public ScreeningBoardResult board(long companyId, long roleId, Integer requestedRound) {
        Context context = context(companyId, roleId);
        int round = requestedRound == null ? activeRound(context.rounds()) : requestedRound;
        requireRound(context.rounds(), round);
        return buildBoard(context, round);
    }

    @Transactional
    @Override
    public ScreeningBoardResult review(long companyId, ScreeningReviewCommand command) {
        Context context = context(companyId, command.roleId());
        ScreeningRoundJpaEntity round = requireRound(context.rounds(), command.round());
        if ("CLOSED".equals(round.status())) {
            throw error("ROUND_ALREADY_CLOSED", "마감된 차수는 결과를 변경할 수 없습니다.");
        }
        if (command.applicationIds().isEmpty()) {
            throw error("APPLICATION_REQUIRED", "지원자를 한 명 이상 선택해 주세요.");
        }
        if (command.status() != null && !STATUSES.contains(command.status())) {
            throw error("INVALID_REVIEW_STATUS", "올바른 심사 결과가 아닙니다.");
        }
        if (command.round() == 1 && "ABSENT".equals(command.status())) {
            throw error("ABSENT_NOT_ALLOWED", "1차 서류 심사에는 불참을 고를 수 없습니다.");
        }
        if ("ETC".equals(command.status()) && isBlank(command.memo())) {
            throw error("MEMO_REQUIRED", "기타 사유를 입력해 주세요.");
        }
        Map<Long, ApplicationReviewJpaEntity> reviews = reviewRepository
                .findAllByRoleIdAndRoundNumber(command.roleId(), command.round()).stream()
                .collect(Collectors.toMap(
                        ApplicationReviewJpaEntity::applicationId, Function.identity()));
        LocalDateTime now = now();
        for (Long applicationId : command.applicationIds()) {
            ApplicationReviewJpaEntity review = reviews.get(applicationId);
            if (review == null) {
                throw error("APPLICATION_NOT_IN_ROUND", "해당 차수의 심사 대상이 아닙니다.");
            }
            review.update(command.status(), command.memo(), command.note(), now);
        }
        return buildBoard(context, command.round());
    }

    @Transactional
    @Override
    public ScreeningBoardResult closeRound(long companyId, long roleId, int roundNumber) {
        Context context = context(companyId, roleId);
        ScreeningRoundJpaEntity round = requireRound(context.rounds(), roundNumber);
        if ("CLOSED".equals(round.status())) {
            throw error("ROUND_ALREADY_CLOSED", "이미 마감된 차수입니다.");
        }
        List<ApplicationReviewJpaEntity> reviews =
                reviewRepository.findAllByRoleIdAndRoundNumber(roleId, roundNumber);
        if (reviews.isEmpty()) {
            throw error("NO_APPLICANTS", "심사할 지원자가 없어 마감할 수 없습니다.");
        }
        if (reviews.stream().anyMatch(review -> "PENDING".equals(review.status()))) {
            throw error("PENDING_REVIEWS_REMAIN", "검토 대기 중인 지원자가 남아 있습니다.");
        }
        round.close(now());
        ScreeningRoundJpaEntity next = context.rounds().stream()
                .filter(candidate -> candidate.roundNumber() == roundNumber + 1)
                .findFirst().orElse(null);
        if (next == null) {
            return buildBoard(context, roundNumber);
        }
        next.open();
        reviews.stream().filter(review -> "PASS".equals(review.status()))
                .map(review -> ApplicationReviewJpaEntity.pending(
                        review.applicationId(), roleId, next.roundNumber()))
                .forEach(reviewRepository::save);
        return buildBoard(context, next.roundNumber());
    }

    private ScreeningBoardResult buildBoard(Context context, int roundNumber) {
        List<ApplicationReviewJpaEntity> currentReviews = reviewRepository
                .findAllByRoleIdAndRoundNumber(context.role().id(), roundNumber);
        ScreeningBoardResult.Counts counts = counts(currentReviews);
        List<ScreeningBoardResult.RoundState> roundStates = context.rounds().stream()
                .map(round -> {
                    ScreeningBoardResult.Counts roundCounts = counts(reviewRepository
                            .findAllByRoleIdAndRoundNumber(
                                    context.role().id(), round.roundNumber()));
                    return new ScreeningBoardResult.RoundState(
                            round.roundNumber(), round.name(), !"LOCKED".equals(round.status()),
                            "CLOSED".equals(round.status()), roundCounts, progress(roundCounts));
                }).toList();
        List<ScreeningBoardResult.Applicant> applicants = currentReviews.stream()
                .map(review -> applicant(context.role(), review, context.rounds()))
                .toList();
        int activeRound = activeRound(context.rounds());
        return new ScreeningBoardResult(
                new ScreeningBoardResult.PerformanceRef(
                        context.performance().id(), context.performance().posterUrl(),
                        context.performance().title()),
                new ScreeningBoardResult.PostingRef(
                        context.posting().id(), context.posting().title(),
                        context.posting().allowsMultipleRoles()),
                new ScreeningBoardResult.RoleSummary(
                        context.role().id(), context.posting().id(), context.role().name(),
                        nullable(context.role().description()), nullable(context.role().quota()),
                        nullable(context.role().genderCondition(), "ANY"),
                        nullable(context.role().ageMin()), nullable(context.role().ageMax(), 120),
                        currentReviews.size(), activeRound,
                        context.rounds().stream().allMatch(item -> "CLOSED".equals(item.status())),
                        progress(counts), counts),
                roundNumber, roundStates, applicants);
    }

    private ScreeningBoardResult.Applicant applicant(
            RoleJpaEntity role,
            ApplicationReviewJpaEntity currentReview,
            List<ScreeningRoundJpaEntity> rounds) {
        ApplicationJpaEntity application = applicationRepository
                .findById(currentReview.applicationId())
                .orElseThrow(() -> error("APPLICATION_NOT_FOUND", "지원서를 찾을 수 없습니다."));
        Map<String, JsonNode> answers = new HashMap<>();
        for (ApplicationAnswerJpaEntity answer : answerRepository
                .findAllByApplicationIdOrderByAnswerOrder(application.id())) {
            try {
                answers.put(answer.fieldKey(), objectMapper.readTree(answer.answerJson()));
            } catch (JacksonException exception) {
                throw error("INVALID_SNAPSHOT", "저장된 지원서 답변을 읽을 수 없습니다.");
            }
        }
        Map<Integer, ScreeningBoardResult.Review> history = new HashMap<>();
        for (ScreeningRoundJpaEntity round : rounds) {
            ScreeningBoardResult.Review review = reviewRepository
                    .findByApplicationIdAndRoleIdAndRoundNumber(
                            application.id(), role.id(), round.roundNumber())
                    .map(this::reviewResult).orElse(null);
            history.put(round.roundNumber(), review);
        }
        int age = Period.between(application.birthDate(), LocalDate.now(clock)).getYears();
        List<String> mismatch = new ArrayList<>();
        if (!"ANY".equals(role.genderCondition())
                && !role.genderCondition().equals(application.gender())) {
            mismatch.add("GENDER");
        }
        if (role.ageMin() != null && age < role.ageMin()
                || role.ageMax() != null && age > role.ageMax()) {
            mismatch.add("AGE");
        }
        return new ScreeningBoardResult.Applicant(
                application.id(), application.name(), application.gender(), age,
                application.height(), application.weight(), role.id(), role.name(),
                application.birthDate().toString(), application.phone(), application.email(),
                text(answers.get("SCHOOL")),
                application.submittedAt().toInstant(ZoneOffset.UTC), List.of(),
                text(answers.get("COVER_LETTER")), text(answers.get("MOTIVATION")),
                photos(answers.get("PHOTOS")), textOrNull(answers.get("VIDEO")),
                reviewResult(currentReview), history, mismatch);
    }

    private List<ScreeningBoardResult.Photo> photos(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<ScreeningBoardResult.Photo> result = new ArrayList<>();
        int index = 1;
        for (JsonNode value : node) {
            result.add(new ScreeningBoardResult.Photo(
                    "프로필 " + index++, value.asText(), value.asText()));
        }
        return result;
    }

    private ScreeningBoardResult.Review reviewResult(ApplicationReviewJpaEntity entity) {
        return new ScreeningBoardResult.Review(
                entity.status(), nullable(entity.memo()), nullable(entity.note()));
    }

    private ScreeningBoardResult.Counts counts(List<ApplicationReviewJpaEntity> reviews) {
        int pending = count(reviews, "PENDING");
        int pass = count(reviews, "PASS");
        int fail = count(reviews, "FAIL");
        int absent = count(reviews, "ABSENT");
        int etc = count(reviews, "ETC");
        return new ScreeningBoardResult.Counts(
                reviews.size(), pending, reviews.size() - pending, pass, fail, absent, etc);
    }

    private int count(List<ApplicationReviewJpaEntity> reviews, String status) {
        return (int) reviews.stream().filter(review -> status.equals(review.status())).count();
    }

    private ScreeningBoardResult.Progress progress(ScreeningBoardResult.Counts counts) {
        int percent = counts.all() == 0 ? 0 : counts.done() * 100 / counts.all();
        return new ScreeningBoardResult.Progress(counts.done(), counts.all(), percent);
    }

    private Context context(long companyId, long roleId) {
        RoleJpaEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> error("ROLE_NOT_FOUND", "배역을 찾을 수 없습니다."));
        PostingJpaEntity posting = postingRepository.findById(role.postingId())
                .orElseThrow(() -> error("POSTING_NOT_FOUND", "공고를 찾을 수 없습니다."));
        PerformanceJpaEntity performance = performanceRepository.findById(posting.performanceId())
                .filter(candidate -> candidate.companyId().equals(companyId))
                .orElseThrow(() -> error("SCREENING_ACCESS_DENIED", "심사 권한이 없습니다."));
        return new Context(
                performance, posting, role,
                roundRepository.findAllByRoleIdOrderByRoundNumber(roleId));
    }

    private int activeRound(List<ScreeningRoundJpaEntity> rounds) {
        return rounds.stream().filter(round -> "OPEN".equals(round.status()))
                .map(ScreeningRoundJpaEntity::roundNumber).findFirst()
                .orElseGet(() -> rounds.isEmpty() ? 1 : rounds.getLast().roundNumber());
    }

    private ScreeningRoundJpaEntity requireRound(
            List<ScreeningRoundJpaEntity> rounds, int number) {
        return rounds.stream().filter(round -> round.roundNumber() == number)
                .findFirst().orElseThrow(() -> error(
                        "INVALID_ROUND_NUMBER", "올바른 차수가 아닙니다."));
    }

    private String text(JsonNode node) {
        return node == null || node.isNull() ? "" : node.asText();
    }

    private String textOrNull(JsonNode node) {
        String value = text(node);
        return value.isBlank() ? null : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String nullable(String value) {
        return value == null ? "" : value;
    }

    private String nullable(String value, String fallback) {
        return value == null ? fallback : value;
    }

    private int nullable(Integer value) {
        return value == null ? 0 : value;
    }

    private int nullable(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }

    private ScreeningException error(String code, String message) {
        return new ScreeningException(code, message);
    }

    private record Context(
            PerformanceJpaEntity performance,
            PostingJpaEntity posting,
            RoleJpaEntity role,
            List<ScreeningRoundJpaEntity> rounds) {
    }
}
