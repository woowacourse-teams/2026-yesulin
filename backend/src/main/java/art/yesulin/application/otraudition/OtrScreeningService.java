package art.yesulin.application.otraudition;

import static art.yesulin.domain.screening.ScreeningReviewErrorCode.INVALID_REVIEW;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;
import static art.yesulin.domain.screening.ScreeningReviewErrorCode.ROUND_NOT_READY;

import art.yesulin.application.file.FileService;
import art.yesulin.application.screening.SaveScreeningReviewsCommand;
import art.yesulin.application.screening.ScreeningApplicantResult;
import art.yesulin.application.screening.ScreeningBoardResult;
import art.yesulin.application.screening.ScreeningCompletionResult;
import art.yesulin.application.screening.ScreeningFilterCondition;
import art.yesulin.application.screening.ScreeningReviewResult;
import art.yesulin.application.screening.ScreeningReviewsResult;
import art.yesulin.application.screening.ScreeningSubmissionDetailResult;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.domain.otraudition.OtrScreeningCompletion;
import art.yesulin.domain.otraudition.OtrScreeningCompletionRepository;
import art.yesulin.domain.otraudition.OtrScreeningReview;
import art.yesulin.domain.otraudition.OtrScreeningReviewRepository;
import art.yesulin.domain.otraudition.OtrSubmission;
import art.yesulin.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OtrScreeningService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private final OtrAuditionRepository auditionRepository;
    private final OtrSubmissionRepository submissionRepository;
    private final OtrScreeningReviewRepository reviewRepository;
    private final OtrScreeningCompletionRepository completionRepository;
    private final FileAssetRepository fileAssetRepository;
    private final FileService fileService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ScreeningBoardResult findBoard(long ownerId, UUID auditionId, int roleOrder,
            int round, ScreeningFilterCondition condition) {
        OtrAudition audition = findAudition(ownerId, auditionId);
        String roleName = roleName(audition, roleOrder, round);
        List<OtrSubmission> submissions = submissions(audition, roleName);
        Map<Long, OtrScreeningReview> reviews = reviews(audition, roleOrder);
        boolean closed = completionRepository.existsByOtrAuditionIdAndRoleOrder(audition.getId(), roleOrder);
        ScreeningBoardResult.Counts counts = counts(submissions, reviews);
        ScreeningBoardResult.Progress progress = progress(counts);
        Map<Long, String> photoUrls = photoUrls(submissions);
        List<ScreeningApplicantResult> applicants = submissions.stream()
                .map(submission -> applicant(submission, audition, roleOrder, roleName,
                        reviews.get(submission.getId()), photoUrls))
                .filter(candidate -> condition == null || condition.matches(candidate))
                .toList();
        return new ScreeningBoardResult(
                new ScreeningBoardResult.Performance(0, 0, "OTR #" + audition.getOtrId()),
                new ScreeningBoardResult.Posting(audition.getPublicId(), audition.getTitle(), false),
                new ScreeningBoardResult.Role(roleOrder, audition.getPublicId(), roleName, "", 0, "ANY", 0, 999,
                        submissions.size(), 1, closed, progress, counts, canComplete(audition)),
                1, List.of(new ScreeningBoardResult.Round(1, "1차 서류 심사", closed, counts, progress)), applicants
        );
    }

    @Transactional(readOnly = true)
    public ScreeningSubmissionDetailResult findSubmission(long ownerId, UUID auditionId, int roleOrder,
            int round, UUID submissionId) {
        ScreeningBoardResult board = findBoard(ownerId, auditionId, roleOrder, round, null);
        ScreeningApplicantResult applicant = board.submissions().stream()
                .filter(candidate -> candidate.id().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 지원서를 찾을 수 없습니다."));
        return new ScreeningSubmissionDetailResult(board.performance(), board.posting(), board.role(),
                board.round(), board.rounds(), applicant);
    }

    @Transactional
    public ScreeningReviewsResult save(long ownerId, UUID auditionId, int roleOrder,
            int round, SaveScreeningReviewsCommand command) {
        OtrAudition audition = findAuditionForUpdate(ownerId, auditionId);
        String roleName = roleName(audition, roleOrder, round);
        if (completionRepository.existsByOtrAuditionIdAndRoleOrder(audition.getId(), roleOrder)) {
            throw new BusinessException(INVALID_REVIEW, "마감된 전형은 수정할 수 없습니다.");
        }
        if (command.submissionIds().size() != command.submissionIds().stream().distinct().count()) {
            throw new BusinessException(INVALID_REVIEW, "같은 지원서를 중복해서 심사할 수 없습니다.");
        }
        ScreeningReviewStatus status = command.status() == null ? null
                : ScreeningReviewStatus.valueOf(command.status().toUpperCase(Locale.ROOT));
        List<ScreeningReviewResult> results = command.submissionIds().stream().map(id -> {
            OtrSubmission submission = submissionRepository
                    .findByPublicIdAndOtrAuditionIdAndSelectedRole(id, audition.getId(), roleName)
                    .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 지원서를 찾을 수 없습니다."));
            OtrScreeningReview review = reviewRepository.findByOtrSubmissionIdAndRoleOrder(
                    submission.getId(), roleOrder).orElseGet(() ->
                            new OtrScreeningReview(audition.getId(), submission.getId(), roleOrder));
            review.update(status, command.otherReason(), command.internalMemo());
            OtrScreeningReview saved = reviewRepository.save(review);
            return new ScreeningReviewResult(submission.getPublicId(), roleOrder, 1,
                    saved.getStatus().name(), saved.getOtherReason(), saved.getInternalMemo());
        }).toList();
        return new ScreeningReviewsResult(roleOrder, 1, results);
    }

    @Transactional
    public ScreeningCompletionResult complete(long ownerId, UUID auditionId, int roleOrder, int round) {
        OtrAudition audition = findAuditionForUpdate(ownerId, auditionId);
        String roleName = roleName(audition, roleOrder, round);
        if (completionRepository.existsByOtrAuditionIdAndRoleOrder(audition.getId(), roleOrder)) {
            return new ScreeningCompletionResult(1, 0, 0, 0, null, true);
        }
        if (!canComplete(audition)) {
            throw new BusinessException(ROUND_NOT_READY, "OTR 지원 마감 다음 날부터 전형을 마감할 수 있습니다.");
        }
        ScreeningBoardResult.Counts counts = counts(submissions(audition, roleName), reviews(audition, roleOrder));
        completionRepository.save(new OtrScreeningCompletion(audition.getId(), roleOrder, Instant.now(clock)));
        return new ScreeningCompletionResult(1, counts.pass(), counts.pending(), 0, null, true);
    }

    private OtrAudition findAudition(long ownerId, UUID auditionId) {
        return auditionRepository.findByPublicIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 OTR 공고를 찾을 수 없습니다."));
    }

    private boolean canComplete(OtrAudition audition) {
        return LocalDate.now(clock.withZone(KOREA)).isAfter(audition.getDeadline());
    }

    private OtrAudition findAuditionForUpdate(long ownerId, UUID auditionId) {
        return auditionRepository.findForUpdateByPublicIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 OTR 공고를 찾을 수 없습니다."));
    }

    private String roleName(OtrAudition audition, int roleOrder, int round) {
        if (round != 1 || roleOrder < 1 || roleOrder > audition.getRoles().size()) {
            throw new BusinessException(NOT_FOUND, "심사할 OTR 배역이나 전형을 찾을 수 없습니다.");
        }
        return audition.getRoles().get(roleOrder - 1);
    }

    private List<OtrSubmission> submissions(OtrAudition audition, String roleName) {
        return submissionRepository.findAllByOtrAuditionIdAndSelectedRoleOrderBySubmittedAtAscIdAsc(
                audition.getId(), roleName);
    }

    private Map<Long, OtrScreeningReview> reviews(OtrAudition audition, int roleOrder) {
        Map<Long, OtrScreeningReview> result = new HashMap<>();
        reviewRepository.findAllByOtrAuditionIdAndRoleOrder(audition.getId(), roleOrder)
                .forEach(review -> result.put(review.getOtrSubmissionId(), review));
        return result;
    }

    private ScreeningBoardResult.Counts counts(List<OtrSubmission> submissions,
            Map<Long, OtrScreeningReview> reviews) {
        int pending = 0;
        int pass = 0;
        int fail = 0;
        int etc = 0;
        for (OtrSubmission submission : submissions) {
            ScreeningReviewStatus status = status(reviews.get(submission.getId()));
            switch (status) {
                case PENDING -> pending++;
                case PASS -> pass++;
                case FAIL -> fail++;
                case ETC -> etc++;
                default -> throw new IllegalStateException("지원하지 않는 심사 상태입니다.");
            }
        }
        return new ScreeningBoardResult.Counts(submissions.size(), pending,
                submissions.size() - pending, pass, fail, etc);
    }

    private ScreeningBoardResult.Progress progress(ScreeningBoardResult.Counts counts) {
        return new ScreeningBoardResult.Progress(counts.done(), counts.all(),
                counts.all() == 0 ? 0 : (int) Math.round(counts.done() * 100.0 / counts.all()));
    }

    private Map<Long, String> photoUrls(List<OtrSubmission> submissions) {
        List<Long> ids = submissions.stream().flatMap(submission -> submission.getPhotoFileIds().stream())
                .distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> urls = new HashMap<>();
        for (FileAsset file : fileAssetRepository.findAllById(ids)) {
            file.ensureUsable();
            urls.put(file.getId(), fileService.privateContentUrl(file.getId()));
        }
        if (urls.size() != ids.size()) {
            throw new IllegalStateException("제출 지원서의 사진 파일을 찾을 수 없습니다.");
        }
        return Map.copyOf(urls);
    }

    private ScreeningApplicantResult applicant(OtrSubmission submission, OtrAudition audition,
            int roleOrder, String roleName, OtrScreeningReview review, Map<Long, String> photoUrls) {
        SubmissionBasicInformation basic = submission.getBasicInformation();
        ScreeningApplicantResult.Review result = review == null
                ? new ScreeningApplicantResult.Review("PENDING", "", "")
                : new ScreeningApplicantResult.Review(review.getStatus().name(), review.getOtherReason(),
                        review.getInternalMemo());
        int age = Period.between(basic.birthDate(), audition.getDeadline()).getYears();
        return new ScreeningApplicantResult(submission.getPublicId(), basic.name(), basic.gender().name(), age,
                basic.height(), basic.weight(), roleOrder, roleName, basic.birthDate(), basic.phone(), basic.email(),
                basic.address(), submission.getEducationLevel(), submission.getSchool(), submission.getMajor(),
                submission.getLinks(), submission.getNationality(), submission.getSpecialty(), submission.getHobbies(),
                submission.getMilitaryServiceStatus() == null ? null : submission.getMilitaryServiceStatus().name(),
                submission.getSubmittedAt(), submission.getCareers().stream().map(career ->
                        new ScreeningApplicantResult.Career(career.year(), career.title(), career.roleName())).toList(),
                submission.getCoverLetter(), List.of(),
                submission.getPhotoFileIds().stream().map(id ->
                        new ScreeningApplicantResult.Photo("사진", photoUrls.get(id))).toList(),
                submission.getVideoUrls().stream().map(url ->
                        new ScreeningApplicantResult.Video("영상", url)).toList(),
                result, Map.of(1, result), List.of());
    }

    private ScreeningReviewStatus status(OtrScreeningReview review) {
        return review == null ? ScreeningReviewStatus.PENDING : review.getStatus();
    }
}
