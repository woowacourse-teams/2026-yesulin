package art.yesulin.dormant.application.screening;

import static art.yesulin.dormant.domain.screening.ScreeningReviewErrorCode.NOT_FOUND;

import art.yesulin.dormant.domain.audition.Audition;
import art.yesulin.dormant.domain.audition.AuditionRepository;
import art.yesulin.dormant.domain.audition.role.AuditionRole;
import art.yesulin.dormant.domain.audition.role.AuditionRoleSection;
import art.yesulin.dormant.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.dormant.domain.audition.schedule.AuditionSchedule;
import art.yesulin.dormant.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.dormant.domain.performance.Performance;
import art.yesulin.dormant.domain.performance.PerformanceRepository;
import art.yesulin.dormant.domain.performance.PerformanceRole;
import art.yesulin.dormant.domain.screening.AuditionScreening;
import art.yesulin.dormant.domain.screening.ScreeningCompletionRepository;
import art.yesulin.dormant.domain.screening.ScreeningReview;
import art.yesulin.dormant.domain.screening.ScreeningReviewRepository;
import art.yesulin.dormant.domain.screening.ScreeningRound;
import art.yesulin.dormant.domain.submission.ScreeningSubmissionSearchCondition;
import art.yesulin.dormant.domain.submission.Submission;
import art.yesulin.dormant.domain.submission.SubmissionRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.file.domain.FileAsset;
import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.global.exception.BusinessException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScreeningQueryService {

    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final PerformanceRepository performanceRepository;
    private final SubmissionRepository submissionRepository;
    private final ScreeningReviewRepository reviewRepository;
    private final ScreeningCompletionRepository completionRepository;
    private final FileAssetRepository fileAssetRepository;
    private final FileService fileService;

    @Transactional(readOnly = true)
    public ScreeningBoardResult findBoard(
            long ownerId,
            long roleId,
            int round,
            ScreeningFilterCondition condition
    ) {
        return createBoard(ownerId, roleId, new ScreeningRound(round), condition).filteredBy(condition);
    }

    @Transactional(readOnly = true)
    public ScreeningSubmissionDetailResult findSubmission(
            long ownerId,
            long roleId,
            int round,
            UUID submissionId
    ) {
        return createBoard(ownerId, roleId, new ScreeningRound(round), null).detail(submissionId);
    }

    private ScreeningBoardResult createBoard(
            long ownerId,
            long roleId,
            ScreeningRound round,
            ScreeningFilterCondition condition
    ) {
        long auditionId = findAuditionId(roleId);
        Audition audition = findAudition(ownerId, auditionId);
        AuditionRoleSection roleSection = roleSectionRepository.findByAuditionId(audition.getId())
                .orElseThrow(() -> new IllegalStateException("공고의 배역 정보를 찾을 수 없습니다."));
        AuditionRole role = findRole(roleSection, roleId);
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(audition.getId())
                .orElseThrow(() -> new IllegalStateException("공고의 일정 정보를 찾을 수 없습니다."));
        Performance performance = performanceRepository.findByIdAndOwnerId(audition.getPerformanceId(), ownerId)
                .orElseThrow(() -> new IllegalStateException("공고가 속한 공연을 찾을 수 없습니다."));
        PerformanceRole performanceRole = findPerformanceRole(performance, role.getPerformanceRoleId());
        AuditionScreening screening = findScreening(audition.getId(), roleId, schedule);
        List<Submission> filteredSubmissions = findFilteredSubmissions(
                audition.getId(), roleId, round, schedule, screening, condition
        );
        Map<Long, String> photoUrls = createPhotoUrls(photoFileIds(filteredSubmissions));
        return ScreeningBoardResult.from(
                audition, roleId, round, performance, performanceRole, role, screening, filteredSubmissions, photoUrls
        );
    }

    private long findAuditionId(long roleId) {
        return roleSectionRepository.findAuditionIdByRoleId(roleId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고 배역이 없습니다."));
    }

    private Audition findAudition(long ownerId, long auditionId) {
        return auditionRepository.findByIdAndOwnerId(auditionId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "심사할 공고를 찾을 수 없습니다."));
    }

    private AuditionScreening findScreening(long auditionId, long roleId, AuditionSchedule schedule) {
        List<Submission> submissions = submissionRepository.findAllForScreening(auditionId, roleId);
        List<UUID> submissionIds = submissions.stream().map(Submission::getSubmissionId).toList();
        List<ScreeningReview> reviews = submissionIds.isEmpty()
                ? List.of()
                : reviewRepository.findAllByAuditionRoleIdAndSubmissionIdIn(roleId, submissionIds);
        return new AuditionScreening(
                roleId, submissions, schedule.getStages(), reviews, completionRepository.findAllByAuditionRoleId(roleId)
        );
    }

    private List<Submission> findFilteredSubmissions(
            long auditionId,
            long roleId,
            ScreeningRound round,
            AuditionSchedule schedule,
            AuditionScreening screening,
            ScreeningFilterCondition condition
    ) {
        if (condition == null) {
            return screening.applicantsFor(round);
        }
        ScreeningSubmissionSearchCondition submissionCondition = condition.toSubmissionCondition();
        if (submissionCondition.isEmpty()) {
            return screening.applicantsFor(round);
        }
        List<Submission> submissions = submissionRepository.findAllForScreening(
                auditionId, roleId, submissionCondition
        );
        List<UUID> submissionIds = submissions.stream().map(Submission::getSubmissionId).toList();
        List<ScreeningReview> reviews = submissionIds.isEmpty()
                ? List.of()
                : reviewRepository.findAllByAuditionRoleIdAndSubmissionIdIn(roleId, submissionIds);
        return new AuditionScreening(
                roleId, submissions, schedule.getStages(), reviews, completionRepository.findAllByAuditionRoleId(roleId)
        )
                .applicantsFor(round);
    }

    private AuditionRole findRole(AuditionRoleSection section, long roleId) {
        return section.getRoles().stream()
                .filter(role -> role.getId() == roleId)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("공고 배역 연결 정보를 찾을 수 없습니다."));
    }

    private PerformanceRole findPerformanceRole(Performance performance, long performanceRoleId) {
        return performance.getRoles().stream()
                .filter(role -> role.getId() == performanceRoleId)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("공연 배역 정보를 찾을 수 없습니다."));
    }

    private List<Long> photoFileIds(List<Submission> submissions) {
        return submissions.stream()
                .flatMap(submission -> submission.getFormAnswers().photoRequirementAnswers().values().stream())
                .map(answer -> answer.fileId())
                .distinct()
                .toList();
    }

    private Map<Long, String> createPhotoUrls(List<Long> fileIds) {
        if (fileIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> urls = new LinkedHashMap<>();
        for (FileAsset fileAsset : fileAssetRepository.findAllById(fileIds)) {
            fileAsset.ensureUsable();
            urls.put(fileAsset.getId(), fileService.privateContentUrl(fileAsset.getId()));
        }
        if (urls.size() != fileIds.size()) {
            throw new IllegalStateException("제출 지원서의 사진 파일을 찾을 수 없습니다.");
        }
        return Map.copyOf(urls);
    }
}
