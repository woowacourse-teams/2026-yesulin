package art.yesulin.application.screening;

import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.role.AuditionRole;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.PerformanceRole;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.screening.ScreeningRound;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScreeningQueryService {

    private final ScreeningReviewTargetFinder targetFinder;
    private final ScreeningSubmissionReader submissionReader;
    private final ScreeningReviewRepository reviewRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final PerformanceRepository performanceRepository;

    @Transactional(readOnly = true)
    public ScreeningBoardResult findBoard(long ownerId, long roleId, int round) {
        ScreeningBoardContext context = loadContext(ownerId, roleId, new ScreeningRound(round));
        return context.toBoardResult();
    }

    @Transactional(readOnly = true)
    public ScreeningSubmissionDetailResult findSubmission(
            long ownerId,
            long roleId,
            int round,
            UUID submissionId
    ) {
        ScreeningBoardContext context = loadContext(ownerId, roleId, new ScreeningRound(round));
        return context.toDetailResult(submissionId);
    }

    private ScreeningBoardContext loadContext(long ownerId, long roleId, ScreeningRound round) {
        ScreeningReviewTarget target = targetFinder.find(ownerId, roleId, round);
        Audition audition = target.audition();
        AuditionRoleSection roleSection = roleSectionRepository.findByAuditionId(audition.getId())
                .orElseThrow(() -> new IllegalStateException("공고의 배역 정보를 찾을 수 없습니다."));
        AuditionRole role = roleSection.getRoles().stream()
                .filter(candidate -> candidate.getId() == roleId)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("공고 배역 연결 정보를 찾을 수 없습니다."));
        AuditionSchedule schedule = scheduleRepository.findByAuditionId(audition.getId())
                .orElseThrow(() -> new IllegalStateException("공고의 일정 정보를 찾을 수 없습니다."));
        Performance performance = performanceRepository.findById(audition.getPerformanceId())
                .orElseThrow(() -> new IllegalStateException("공고가 속한 공연을 찾을 수 없습니다."));
        PerformanceRole performanceRole = performance.getRoles().stream()
                .filter(candidate -> candidate.getId() == role.getPerformanceRoleId())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("공연 배역 정보를 찾을 수 없습니다."));
        List<ScreeningSubmissionView> submissions = submissionReader.findAll(audition.getId(), roleId);
        List<UUID> submissionIds = submissions.stream().map(ScreeningSubmissionView::id).toList();
        List<ScreeningReview> reviews = submissionIds.isEmpty()
                ? List.of()
                : reviewRepository.findAllByAuditionRoleIdAndSubmissionIdIn(roleId, submissionIds);
        return new ScreeningBoardContext(target, performance, performanceRole, role, schedule, submissions, reviews);
    }
}
