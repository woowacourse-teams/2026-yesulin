package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_schedules", uniqueConstraints = {
        @UniqueConstraint(name = "uk_audition_schedules_audition_id", columnNames = "audition_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audition_id", nullable = false, updatable = false)
    private long auditionId;

    @Embedded
    private RecruitmentPeriod recruitmentPeriod;

    @Getter(AccessLevel.NONE)
    @Embedded
    private ScreeningStages stages;

    public AuditionSchedule(long auditionId, AuditionSchedulePlan plan) {
        this.auditionId = requirePositive(auditionId, "공고 ID는 1 이상이어야 합니다.");
        requireNonNull(plan, "공고 일정 정보는 필수입니다.");
        this.recruitmentPeriod = plan.recruitmentPeriod();
        this.stages = new ScreeningStages(this, plan.stages());
    }

    public AuditionSchedule replace(AuditionSchedulePlan plan) {
        requireNonNull(plan, "공고 일정 정보는 필수입니다.");
        this.recruitmentPeriod = plan.recruitmentPeriod();
        this.stages.replace(this, plan.stages());
        return this;
    }

    public void ensurePublishableAt(Instant publicationTime) {
        recruitmentPeriod.ensureNotEndedAt(publicationTime);
    }

    public List<ScreeningStage> getStages() {
        return stages.values();
    }
}
