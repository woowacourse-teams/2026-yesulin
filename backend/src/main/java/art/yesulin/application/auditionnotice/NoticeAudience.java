package art.yesulin.application.auditionnotice;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.audition.schedule.ScreeningStage;
import art.yesulin.domain.auditionnotice.NoticeError;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.domain.otraudition.OtrScreeningReview;
import art.yesulin.domain.otraudition.OtrScreeningReviewRepository;
import art.yesulin.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.screening.AuditionScreening;
import art.yesulin.domain.screening.ScreeningCompletionRepository;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.domain.screening.ScreeningRound;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NoticeAudience {

    private final AuditionRepository auditions;
    private final AuditionRoleSectionRepository roles;
    private final AuditionScheduleRepository schedules;
    private final SubmissionRepository submissions;
    private final ScreeningReviewRepository reviews;
    private final ScreeningCompletionRepository completions;
    private final ProducerRepository producers;
    private final MemberRepository members;
    private final OtrAuditionRepository otrAuditions;
    private final OtrSubmissionRepository otrSubmissions;
    private final OtrScreeningReviewRepository otrReviews;

    public Context load(long ownerId, NoticeScope scope, int round) {
        members.findById(ownerId).filter(m -> m.getType() == MemberType.PRODUCER
                && m.getStatus() == MemberStatus.ACTIVE).orElseThrow(NoticeAudience::notFound);
        if (scope.otrAuditionId() != null) {
            return loadOtr(ownerId, scope, round);
        }
        long roleId = scope.roleId();
        long auditionId = roles.findAuditionIdByRoleId(roleId).orElseThrow(NoticeAudience::notFound);
        Audition audition = auditions.findByIdAndOwnerIdForUpdate(auditionId, ownerId)
                .orElseThrow(NoticeAudience::notFound);
        List<ScreeningStage> stages = schedules.findByAuditionId(auditionId)
                .orElseThrow(NoticeAudience::notFound).getStages();
        List<Submission> applicants = submissions.findAllForScreening(auditionId, roleId);
        List<UUID> ids = applicants.stream().map(Submission::getSubmissionId).toList();
        AuditionScreening screening = new AuditionScreening(roleId, applicants, stages,
                ids.isEmpty() ? List.of() : reviews.findAllByAuditionRoleIdAndSubmissionIdIn(roleId, ids),
                completions.findAllByAuditionRoleId(roleId));
        ScreeningRound source = new ScreeningRound(round);
        screening.applicantsFor(source);
        Producer producer = producers.findByMemberId(ownerId).orElseThrow(NoticeAudience::notFound);
        List<NoticeService.Candidate> candidates = screening.applicantsFor(source).stream()
                .filter(s -> screening.reviewOf(s.getSubmissionId(), source)
                        .filter(r -> r.getStatus() == ScreeningReviewStatus.PASS).isPresent())
                .map(s -> new NoticeService.Candidate(s.getSubmissionId(),
                        s.getApplicantSnapshot().getBasicInformation().name(),
                        s.getApplicantSnapshot().getBasicInformation().phone())).toList();
        return new Context(audition.getTitle(), producer, stages, candidates, round);
    }

    private Context loadOtr(long ownerId, NoticeScope scope, int round) {
        OtrAudition audition = otrAuditions.findForUpdateByPublicIdAndOwnerId(scope.otrAuditionId(), ownerId)
                .orElseThrow(NoticeAudience::notFound);
        if (round != 1 || scope.roleId() > audition.getRoles().size()) {
            throw notFound();
        }
        int roleOrder = Math.toIntExact(scope.roleId());
        List<Long> passedIds = otrReviews.findAllByOtrAuditionIdAndRoleOrder(audition.getId(), roleOrder).stream()
                .filter(r -> r.getStatus() == ScreeningReviewStatus.PASS)
                .map(OtrScreeningReview::getOtrSubmissionId).toList();
        List<NoticeService.Candidate> candidates = otrSubmissions
                .findAllByOtrAuditionIdAndSelectedRoleOrderBySubmittedAtAscIdAsc(
                        audition.getId(), audition.getRoles().get(roleOrder - 1)).stream()
                .filter(s -> passedIds.contains(s.getId()))
                .map(s -> new NoticeService.Candidate(s.getPublicId(),
                        s.getBasicInformation().name(), s.getBasicInformation().phone())).toList();
        Producer producer = producers.findByMemberId(ownerId).orElseThrow(NoticeAudience::notFound);
        return new Context(audition.getTitle(), producer, List.of(), candidates, round);
    }

    private static BusinessException notFound() {
        return new BusinessException(NoticeError.NOT_FOUND, "안내할 공고·전형 또는 권한을 찾을 수 없습니다.");
    }

    public record Context(String title, Producer producer, List<ScreeningStage> stages,
                          List<NoticeService.Candidate> candidates, int round) {

        public NoticeService.Candidate passed(UUID id) {
            return candidates.stream().filter(s -> s.submissionId().equals(id)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "선택한 차수의 합격자가 아닙니다. 목록을 다시 확인해 주세요."));
        }

        public Long sourceStageId() {
            return stages.isEmpty() ? null : stages.get(round - 1).getId();
        }

        public ScreeningStage target(Long targetId) {
            if (round >= stages.size() && targetId == null) {
                return null;
            }
            if (round >= stages.size() || targetId == null
                    || !stages.get(round).getId().equals(targetId)) {
                throw new IllegalArgumentException("다음 전형을 지정해 주세요. 마지막 차수는 별도 일정으로 안내합니다.");
            }
            return stages.get(round);
        }

        public String footer() {
            return "문의: " + producer.getPhone();
        }

        public String messageHeader() {
            return "안녕하세요, " + producer.getCompanyName() + "입니다.\n"
                    + "{이름}님께서 '" + title + "' 오디션 대상자로 선정되셨습니다.";
        }
    }
}
