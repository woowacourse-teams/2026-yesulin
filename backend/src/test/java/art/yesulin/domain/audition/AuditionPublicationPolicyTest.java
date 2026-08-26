package art.yesulin.domain.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.AdditionalQuestionPlans;
import art.yesulin.domain.audition.form.ApplicationFields;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirementPlans;
import art.yesulin.domain.audition.form.VideoRequirementPlans;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSelection;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import art.yesulin.domain.audition.schedule.ScreeningStagePlans;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AuditionPublicationPolicyTest {

    private static final long AUDITION_ID = 1L;
    private static final Instant PUBLICATION_TIME = Instant.parse("2026-09-05T00:00:00Z");

    private final AuditionPublicationPolicy publicationPolicy = new AuditionPublicationPolicy();

    @Test
    void publishesWhenAllSectionsAreReady() {
        Audition audition = audition();

        publicationPolicy.publish(
                audition,
                Optional.of(roleSection()),
                Optional.of(schedule(PUBLICATION_TIME.plusSeconds(60))),
                Optional.of(form()),
                PUBLICATION_TIME
        );

        assertEquals(AuditionStatus.PUBLISHED, audition.getStatus());
        assertEquals(PUBLICATION_TIME, audition.getPublishedAt());
    }

    @Test
    void missingSectionLeavesDraftUnchanged() {
        Audition audition = audition();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> publicationPolicy.publish(
                        audition,
                        Optional.empty(),
                        Optional.of(schedule(PUBLICATION_TIME.plusSeconds(60))),
                        Optional.of(form()),
                        PUBLICATION_TIME
                )
        );

        assertEquals(AuditionErrorCode.PUBLISHING_NOT_READY, exception.getErrorCode());
        assertEquals(AuditionStatus.DRAFT, audition.getStatus());
    }

    @Test
    void rejectsStageAfterPerformanceEndAtPublication() {
        Audition audition = new Audition(
                1L,
                1L,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 9))
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> publicationPolicy.publish(
                        audition,
                        Optional.of(roleSection()),
                        Optional.of(schedule(PUBLICATION_TIME.plusSeconds(60))),
                        Optional.of(form()),
                        PUBLICATION_TIME
                )
        );

        assertEquals(AuditionErrorCode.INVALID_SCHEDULE, exception.getErrorCode());
        assertEquals(AuditionStatus.DRAFT, audition.getStatus());
    }

    private Audition audition() {
        return new Audition(
                1L,
                1L,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        );
    }

    private AuditionRoleSection roleSection() {
        AuditionRoleCondition condition = new AuditionRoleCondition(1, RoleGender.ANY, 0, 100);
        AuditionRoleSelections selections = new AuditionRoleSelections(
                false, List.of(new AuditionRoleSelection(1L, condition))
        );
        return new AuditionRoleSection(AUDITION_ID, selections);
    }

    private AuditionSchedule schedule(Instant recruitmentEndAt) {
        RecruitmentPeriod period = new RecruitmentPeriod(PUBLICATION_TIME.minusSeconds(60), recruitmentEndAt);
        ScreeningStagePlans stages = new ScreeningStagePlans(List.of(
                new ScreeningStagePlan(null, "1차 오디션", LocalDate.of(2026, 9, 10), "")
        ));
        return new AuditionSchedule(AUDITION_ID, new AuditionSchedulePlan(period, stages));
    }

    private AuditionForm form() {
        AuditionFormPlan plan = new AuditionFormPlan(
                new ApplicationFields(List.of(BasicInformationField.NAME), List.of()),
                new PhotoRequirementPlans(List.of()),
                new VideoRequirementPlans(List.of()),
                new AdditionalQuestionPlans(List.of())
        );
        return new AuditionForm(AUDITION_ID, plan);
    }
}
