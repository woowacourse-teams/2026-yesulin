package art.yesulin.application.performance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileErrorCode;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:performance;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class PerformanceServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @BeforeEach
    void cleanUp() {
        performanceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void createsPerformanceAndAssignsIdsToEveryRole() {
        long posterFileId = uploadReadyPoster();
        CreatePerformanceCommand command = new CreatePerformanceCommand(
                posterFileId,
                "햄릿",
                "서울특별시 종로구 대학로 12",
                List.of(
                        new CreatePerformanceRoleCommand("햄릿", "복수심에 흔들리는 덴마크 왕자"),
                        new CreatePerformanceRoleCommand("오필리어", "햄릿을 사랑하는 인물")
                )
        );

        PerformanceResult result = performanceService.create(OWNER_ID, command);

        assertNotNull(result.id());
        assertEquals(2, result.roles().size());
        assertTrue(result.roles().stream().allMatch(role -> role.id() > 0));
        Performance saved = performanceRepository.findById(result.id()).orElseThrow();
        assertEquals(OWNER_ID, saved.getOwnerId());
        assertEquals(posterFileId, saved.getPosterFileId());
    }

    @Test
    void createsPerformanceWithoutRoles() {
        long posterFileId = uploadReadyPoster();
        CreatePerformanceCommand command = new CreatePerformanceCommand(
                posterFileId, "배역 안내 없는 공연", "서울특별시 중구 세종대로 110", List.of()
        );

        PerformanceResult result = performanceService.create(OWNER_ID, command);

        assertTrue(result.roles().isEmpty());
    }

    @Test
    void rollsBackPerformanceWhenPosterUploadIsNotReady() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("pending.png", "image/png", 1_024L)
        );
        CreatePerformanceCommand command = new CreatePerformanceCommand(
                upload.fileId(), "햄릿", "서울특별시 종로구 대학로 12", List.of()
        );

        BusinessException exception = assertThrows(
                BusinessException.class, () -> performanceService.create(OWNER_ID, command)
        );

        assertEquals(FileErrorCode.NOT_READY, exception.getErrorCode());
        assertEquals(0, performanceRepository.count());
    }

    private long uploadReadyPoster() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }
}
