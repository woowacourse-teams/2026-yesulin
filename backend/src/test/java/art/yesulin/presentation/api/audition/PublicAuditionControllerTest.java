package art.yesulin.presentation.api.audition;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.audition.AuditionPublicationService;
import art.yesulin.application.audition.AuditionService;
import art.yesulin.application.audition.CreateAuditionCommand;
import art.yesulin.application.audition.form.AuditionFormService;
import art.yesulin.application.audition.form.SaveAuditionFormCommand;
import art.yesulin.application.audition.role.AuditionRoleService;
import art.yesulin.application.audition.role.SaveAuditionRoleCommand;
import art.yesulin.application.audition.role.SaveAuditionRolesCommand;
import art.yesulin.application.audition.schedule.AuditionScheduleService;
import art.yesulin.application.audition.schedule.SaveAuditionScheduleCommand;
import art.yesulin.application.audition.schedule.SaveScreeningStageCommand;
import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.CreatePerformanceRoleCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:public-audition-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class PublicAuditionControllerTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FileService fileService;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private AuditionService auditionService;

    @Autowired
    private AuditionRoleService roleService;

    @Autowired
    private AuditionScheduleService scheduleService;

    @Autowired
    private AuditionFormService formService;

    @Autowired
    private AuditionPublicationService publicationService;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private AuditionRoleSectionRepository roleRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionFormRepository formRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private ProducerRepository producerRepository;

    @BeforeEach
    void cleanUp() {
        formRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
        producerRepository.deleteAll();

        Producer producer = new Producer(OWNER_ID, "극단 예술인", "01012345678");
        producer.updateDescription("정통 연극을 만드는 극단입니다.");
        producerRepository.save(producer);
    }

    @Test
    void findsPublishedAuditionWithoutProducerSession() throws Exception {
        PerformanceResult performance = createPerformance();
        UUID auditionId = UUID.randomUUID();
        auditionService.create(OWNER_ID, new CreateAuditionCommand(
                auditionId, performance.id(), "햄릿 공개 오디션", LocalDate.of(2100, 10, 1), null
        ));
        roleService.save(OWNER_ID, auditionId, new SaveAuditionRolesCommand(false, List.of(
                new SaveAuditionRoleCommand(performance.roles().getFirst().id(), 2, RoleGender.ANY, 18, 40)
        )));
        scheduleService.save(OWNER_ID, auditionId, new SaveAuditionScheduleCommand(
                Instant.parse("2100-09-01T00:00:00Z"),
                Instant.parse("2100-09-10T00:00:00Z"),
                List.of(new SaveScreeningStageCommand(null, "1차 심사", LocalDate.of(2100, 9, 12), ""))
        ));
        formService.save(OWNER_ID, auditionId, new SaveAuditionFormCommand(
                List.of("NAME"), List.of(), List.of(), List.of(), List.of()
        ));
        publicationService.publish(OWNER_ID, auditionId);

        mockMvc.perform(get("/api/v1/public/auditions/{auditionId}", auditionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(auditionId.toString()))
                .andExpect(jsonPath("$.performanceTitle").value("햄릿"))
                .andExpect(jsonPath("$.title").value("햄릿 공개 오디션"))
                .andExpect(jsonPath("$.producer.companyName").value("극단 예술인"))
                .andExpect(jsonPath("$.producer.description").value("정통 연극을 만드는 극단입니다."))
                .andExpect(jsonPath("$.producer.contactName").doesNotExist())
                .andExpect(jsonPath("$.producer.email").doesNotExist())
                .andExpect(jsonPath("$.producer.phone").doesNotExist())
                .andExpect(jsonPath("$.roles[0].name").value("햄릿"))
                .andExpect(jsonPath("$.applicationForm.basicFields[0]").value("NAME"));
    }

    private PerformanceResult createPerformance() {
        return performanceService.create(OWNER_ID, new CreatePerformanceCommand(
                uploadReadyImage(),
                "햄릿",
                "서울특별시 종로구 대학로 12",
                List.of(new CreatePerformanceRoleCommand("햄릿", "덴마크 왕자"))
        ));
    }

    private long uploadReadyImage() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }
}
