package art.yesulin.application.audition;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.application.audition.role.AuditionRoleService;
import art.yesulin.application.audition.role.AuditionRolesResult;
import art.yesulin.application.audition.role.SaveAuditionRoleCommand;
import art.yesulin.application.audition.role.SaveAuditionRolesCommand;
import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.CreatePerformanceRoleCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.application.performance.UpdatePerformanceRoleCommand;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-sections;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class AuditionSectionServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private AuditionRoleService roleService;

    @Autowired
    private AuditionService auditionService;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileService fileService;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @BeforeEach
    void cleanUp() {
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void savesRoleConditionsAndKeepsRoleIdsOnRepeatedSectionSave() {
        PerformanceResult performance = createPerformance();
        AuditionResult audition = createAudition(performance.id());
        long firstRoleId = performance.roles().getFirst().id();
        long secondRoleId = performance.roles().get(1).id();

        AuditionRolesResult first = roleService.save(
                OWNER_ID,
                audition.id(),
                new SaveAuditionRolesCommand(
                        true,
                        List.of(role(firstRoleId, 2), role(secondRoleId, 1))
                )
        );
        Map<Long, Long> initialIds = first.roles().stream().collect(Collectors.toMap(
                role -> role.performanceRoleId(), role -> role.id()
        ));

        AuditionRolesResult changed = roleService.save(
                OWNER_ID,
                audition.id(),
                new SaveAuditionRolesCommand(
                        true,
                        List.of(role(secondRoleId, 3), role(firstRoleId, 4))
                )
        );

        assertEquals(2, changed.roles().size());
        assertEquals(3, changed.roles().getFirst().recruitmentCount());
        changed.roles().forEach(role -> assertEquals(initialIds.get(role.performanceRoleId()), role.id()));

        performanceService.updateRole(
                OWNER_ID,
                performance.id(),
                firstRoleId,
                new UpdatePerformanceRoleCommand("햄릿 왕자", "수정된 배역 설명")
        );
        AuditionRolesResult reflected = roleService.find(OWNER_ID, audition.id());
        assertEquals("햄릿 왕자", reflected.roles().get(1).name());
        assertEquals("수정된 배역 설명", reflected.roles().get(1).description());
    }

    private PerformanceResult createPerformance() {
        return performanceService.create(
                OWNER_ID,
                new CreatePerformanceCommand(
                        uploadReadyImage(),
                        "햄릿",
                        "서울특별시 종로구 대학로 12",
                        List.of(
                                new CreatePerformanceRoleCommand("햄릿", "왕자"),
                                new CreatePerformanceRoleCommand("오필리어", "귀족 여성")
                        )
                )
        );
    }

    private AuditionResult createAudition(long performanceId) {
        return auditionService.create(
                OWNER_ID,
                new CreateAuditionCommand(
                        UUID.randomUUID(), performanceId, "햄릿 오디션", LocalDate.of(2026, 11, 1), null
                )
        );
    }

    private SaveAuditionRoleCommand role(long performanceRoleId, int recruitmentCount) {
        return new SaveAuditionRoleCommand(performanceRoleId, recruitmentCount, RoleGender.ANY, 18, 40);
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
