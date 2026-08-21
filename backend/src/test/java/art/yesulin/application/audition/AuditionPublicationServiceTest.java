package art.yesulin.application.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionErrorCode;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.form.AdditionalQuestionPlans;
import art.yesulin.domain.audition.form.ApplicationFields;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirementPlans;
import art.yesulin.domain.audition.form.VideoRequirementPlans;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSelection;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import art.yesulin.domain.audition.schedule.ScreeningStagePlans;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-publication;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPublicationServiceTest.FixedClockConfiguration.class})
class AuditionPublicationServiceTest {

    private static final long OWNER_ID = 1L;
    private static final Instant NOW = Instant.parse("2026-09-05T00:00:00Z");

    @Autowired
    private AuditionPublicationService publicationService;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionFormRepository formRepository;

    @BeforeEach
    void cleanUp() {
        formRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
    }

    @Test
    void publishesCompleteDraftEvenAfterRecruitmentHasStarted() {
        Audition audition = saveDraft();
        saveRoleSection(audition.getId());
        saveSchedule(audition.getId(), NOW.plusSeconds(86_400));
        saveForm(audition.getId());

        AuditionResult published = publicationService.publish(OWNER_ID, audition.getPublicId());
        AuditionResult retried = publicationService.publish(OWNER_ID, audition.getPublicId());

        assertEquals("PUBLISHED", published.status());
        assertEquals(NOW, published.publishedAt());
        assertEquals(published.publishedAt(), retried.publishedAt());
    }

    @Test
    void requiresEverySectionBeforePublication() {
        Audition audition = saveDraft();

        assertPublishingNotReady(audition.getPublicId());
        saveRoleSection(audition.getId());
        assertPublishingNotReady(audition.getPublicId());
        saveSchedule(audition.getId(), NOW.plusSeconds(86_400));
        assertPublishingNotReady(audition.getPublicId());
    }

    @Test
    void rejectsPublicationWhenRecruitmentHasEnded() {
        Audition audition = saveDraft();
        saveRoleSection(audition.getId());
        saveSchedule(audition.getId(), NOW);
        saveForm(audition.getId());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> publicationService.publish(OWNER_ID, audition.getPublicId())
        );

        assertEquals(AuditionErrorCode.PUBLISHING_CLOSED, exception.getErrorCode());
    }

    @Test
    void hidesAnotherOwnersDraft() {
        Audition audition = saveDraft();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> publicationService.publish(2L, audition.getPublicId())
        );

        assertEquals(AuditionErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    private void assertPublishingNotReady(UUID auditionId) {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> publicationService.publish(OWNER_ID, auditionId)
        );
        assertEquals(AuditionErrorCode.PUBLISHING_NOT_READY, exception.getErrorCode());
    }

    private Audition saveDraft() {
        return auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
    }

    private void saveRoleSection(long auditionId) {
        AuditionRoleCondition condition = new AuditionRoleCondition(1, RoleGender.ANY, 0, 100);
        AuditionRoleSelections selections = new AuditionRoleSelections(
                false, List.of(new AuditionRoleSelection(1L, condition))
        );
        roleSectionRepository.save(new AuditionRoleSection(auditionId, selections));
    }

    private void saveSchedule(long auditionId, Instant recruitmentEndAt) {
        RecruitmentPeriod period = new RecruitmentPeriod(NOW.minusSeconds(86_400), recruitmentEndAt);
        ScreeningStagePlans stages = new ScreeningStagePlans(List.of(
                new ScreeningStagePlan(null, "1차 오디션", LocalDate.of(2026, 9, 10), "")
        ));
        scheduleRepository.save(new AuditionSchedule(auditionId, new AuditionSchedulePlan(period, stages)));
    }

    private void saveForm(long auditionId) {
        AuditionFormPlan plan = new AuditionFormPlan(
                new ApplicationFields(List.of(BasicInformationField.NAME), List.of()),
                new PhotoRequirementPlans(List.of()),
                new VideoRequirementPlans(List.of()),
                new AdditionalQuestionPlans(List.of())
        );
        formRepository.save(new AuditionForm(auditionId, plan));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
