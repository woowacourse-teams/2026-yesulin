package art.yesulin.application.audition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AdditionalQuestionPlans;
import art.yesulin.domain.audition.form.ApplicationFields;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirementPlans;
import art.yesulin.domain.audition.form.VideoRequirementPlans;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ScreeningTestFixture;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-deletion;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class AuditionDeletionServiceTest {

    private static final long OWNER_ID = 1L;
    private static final long OTHER_OWNER_ID = 2L;
    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");

    @Autowired
    private AuditionDeletionService auditionDeletionService;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionFormRepository formRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ScreeningReviewRepository screeningReviewRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    private ScreeningTestFixture.Fixture fixture;

    @BeforeEach
    void setUp() {
        screeningReviewRepository.deleteAll();
        submissionRepository.deleteAll();
        formRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileAssetRepository.deleteAll();
        fixture = new ScreeningTestFixture(
                performanceRepository, auditionRepository, roleSectionRepository, scheduleRepository,
                submissionRepository, fileAssetRepository
        ).save(OWNER_ID, SUBMISSION_ID, 1);
        formRepository.saveAndFlush(new AuditionForm(fixture.auditionId(), new AuditionFormPlan(
                new ApplicationFields(List.of(BasicInformationField.NAME), List.of()),
                new PhotoRequirementPlans(List.of()),
                new VideoRequirementPlans(List.of()),
                new AdditionalQuestionPlans(List.of())
        )));
    }

    @Test
    void deletesAuditionWithRoleScheduleAndForm() {
        submissionRepository.deleteAll();

        auditionDeletionService.delete(OWNER_ID, publicId());

        assertThat(auditionRepository.findById(fixture.auditionId())).isEmpty();
        assertThat(roleSectionRepository.findByAuditionId(fixture.auditionId())).isEmpty();
        assertThat(scheduleRepository.findByAuditionId(fixture.auditionId())).isEmpty();
        assertThat(formRepository.findByAuditionId(fixture.auditionId())).isEmpty();
    }

    @Test
    void keepsAuditionThatAlreadyHasSubmissions() {
        assertThatThrownBy(() -> auditionDeletionService.delete(OWNER_ID, publicId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("접수된 지원서");

        assertThat(auditionRepository.findById(fixture.auditionId())).isPresent();
        assertThat(submissionRepository.findBySubmissionId(SUBMISSION_ID)).isPresent();
    }

    @Test
    void hidesAuditionOfAnotherOwner() {
        submissionRepository.deleteAll();

        assertThatThrownBy(() -> auditionDeletionService.delete(OTHER_OWNER_ID, publicId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("공고를 찾을 수 없습니다");

        assertThat(auditionRepository.findById(fixture.auditionId())).isPresent();
    }

    private UUID publicId() {
        Audition audition = auditionRepository.findById(fixture.auditionId()).orElseThrow();
        return audition.getPublicId();
    }
}
