package art.yesulin.domain.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.PUBLISHING_NOT_READY;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import java.time.Instant;
import java.util.Optional;

public class AuditionPublicationPolicy {

    public void publish(
            Audition audition,
            Optional<AuditionRoleSection> roleSection,
            Optional<AuditionSchedule> schedule,
            Optional<AuditionForm> form,
            Instant publicationTime
    ) {
        requireNonNull(audition, "공고는 필수입니다.");
        requireNonNull(roleSection, "공고 배역 조회 결과는 필수입니다.");
        requireNonNull(schedule, "공고 일정 조회 결과는 필수입니다.");
        requireNonNull(form, "지원 폼 조회 결과는 필수입니다.");
        requireNonNull(publicationTime, "공고 게시 시각은 필수입니다.");
        if (audition.isPublished()) {
            return;
        }
        ensureRoleSectionExists(roleSection);
        AuditionSchedule savedSchedule = getSchedule(schedule);
        ensureFormExists(form);
        savedSchedule.ensurePublishableAt(publicationTime);
        savedSchedule.ensureWithinPerformanceEnd(audition.getPerformanceEndDate());
        audition.publish(publicationTime);
    }

    private void ensureRoleSectionExists(Optional<AuditionRoleSection> roleSection) {
        roleSection.orElseThrow(
                () -> new BusinessException(PUBLISHING_NOT_READY, "배역 정보를 저장한 뒤 공고를 게시할 수 있습니다.")
        );
    }

    private AuditionSchedule getSchedule(Optional<AuditionSchedule> schedule) {
        return schedule.orElseThrow(
                () -> new BusinessException(PUBLISHING_NOT_READY, "일정을 저장한 뒤 공고를 게시할 수 있습니다.")
        );
    }

    private void ensureFormExists(Optional<AuditionForm> form) {
        form.orElseThrow(
                () -> new BusinessException(PUBLISHING_NOT_READY, "지원 폼을 저장한 뒤 공고를 게시할 수 있습니다.")
        );
    }
}
