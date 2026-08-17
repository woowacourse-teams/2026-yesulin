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
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceErrorCode;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.event.PerformancePosterChangedEvent;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:performance;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@RecordApplicationEvents
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
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private ApplicationEvents applicationEvents;

    @BeforeEach
    void cleanUp() {
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
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
        assertNotNull(result.createdAt());
        assertEquals(2, result.roles().size());
        assertTrue(result.roles().stream().allMatch(role -> role.id() > 0));
        Performance saved = performanceRepository.findById(result.id()).orElseThrow();
        FileReference reference = findPosterReference(result.id(), posterFileId);
        assertEquals(OWNER_ID, saved.getOwnerId());
        assertEquals(posterFileId, saved.getPosterFileId());
        assertEquals(posterFileId, reference.getFileId());
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

    @Test
    void updatesBasicInformationWithoutChangingPoster() {
        long firstPosterFileId = uploadReadyPoster();
        PerformanceResult created = createPerformance(firstPosterFileId);
        UpdatePerformanceBasicInformationCommand command = new UpdatePerformanceBasicInformationCommand(
                "햄릿 리뉴얼", "서울특별시 중구 세종대로 110"
        );

        PerformanceResult updated = performanceService.updateBasicInformation(OWNER_ID, created.id(), command);

        assertEquals(firstPosterFileId, updated.posterFileId());
        assertEquals("햄릿 리뉴얼", updated.title());
        assertEquals("서울특별시 중구 세종대로 110", updated.roadAddress());
        assertEquals(created.roles(), updated.roles());
        assertEquals(0, applicationEvents.stream(PerformancePosterChangedEvent.class).count());
    }

    @Test
    void updatesPosterAndPublishesPosterChangedEvent() {
        long firstPosterFileId = uploadReadyPoster();
        PerformanceResult created = createPerformance(firstPosterFileId);
        long changedPosterFileId = uploadReadyPoster();

        PerformanceResult updated = performanceService.updatePoster(
                OWNER_ID, created.id(), new UpdatePerformancePosterCommand(changedPosterFileId)
        );

        assertEquals(changedPosterFileId, updated.posterFileId());
        assertEquals(created.title(), updated.title());
        PerformancePosterChangedEvent event = applicationEvents.stream(PerformancePosterChangedEvent.class)
                .findFirst().orElseThrow();
        assertEquals(firstPosterFileId, event.previousPosterFileId());
        assertEquals(changedPosterFileId, event.currentPosterFileId());
        assertEquals(changedPosterFileId, findPosterReference(created.id(), changedPosterFileId).getFileId());
    }

    @Test
    void rollsBackEveryChangeWhenChangedPosterIsNotReady() {
        PerformanceResult created = createPerformance(uploadReadyPoster());
        FileUploadResult pending = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("pending-change.png", "image/png", 2_048L)
        );
        UpdatePerformancePosterCommand command = new UpdatePerformancePosterCommand(pending.fileId());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> performanceService.updatePoster(OWNER_ID, created.id(), command)
        );

        assertEquals(FileErrorCode.NOT_READY, exception.getErrorCode());
        Performance saved = performanceRepository.findById(created.id()).orElseThrow();
        assertEquals(created.posterFileId(), saved.getPosterFileId());
    }

    @Test
    void addsUpdatesAndRemovesRoleIndividually() {
        PerformanceResult created = createPerformance(uploadReadyPoster());
        long removedRoleId = created.roles().get(1).id();

        PerformanceRoleResult added = performanceService.addRole(
                OWNER_ID,
                created.id(),
                new CreatePerformanceRoleCommand("클로디어스", "새로 추가한 배역")
        );
        PerformanceRoleResult updated = performanceService.updateRole(
                OWNER_ID,
                created.id(),
                created.roles().getFirst().id(),
                new UpdatePerformanceRoleCommand("햄릿 왕", "수정된 기존 배역")
        );
        performanceService.removeRole(OWNER_ID, created.id(), removedRoleId);
        final PerformanceResult found = performanceService.updateBasicInformation(
                OWNER_ID,
                created.id(),
                new UpdatePerformanceBasicInformationCommand(created.title(), created.roadAddress())
        );

        assertTrue(added.id() > 0);
        assertEquals(created.roles().getFirst().id(), updated.id());
        assertEquals("햄릿 왕", updated.name());
        assertTrue(found.roles().stream().noneMatch(role -> role.id() == removedRoleId));
        assertTrue(found.roles().stream().anyMatch(role -> role.id() == added.id()));
    }

    @Test
    void rejectsRoleIdThatDoesNotBelongToPerformance() {
        PerformanceResult created = createPerformance(uploadReadyPoster());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> performanceService.updateRole(
                        OWNER_ID,
                        created.id(),
                        Long.MAX_VALUE,
                        new UpdatePerformanceRoleCommand("유령 배역", "존재하지 않는 배역")
                )
        );

        assertEquals(PerformanceErrorCode.ROLE_NOT_FOUND, exception.getErrorCode());
    }

    private PerformanceResult createPerformance(long posterFileId) {
        CreatePerformanceCommand command = new CreatePerformanceCommand(
                posterFileId,
                "햄릿",
                "서울특별시 종로구 대학로 12",
                List.of(
                        new CreatePerformanceRoleCommand("햄릿", "복수심에 흔들리는 덴마크 왕자"),
                        new CreatePerformanceRoleCommand("오필리어", "햄릿을 사랑하는 인물")
                )
        );
        return performanceService.create(OWNER_ID, command);
    }

    private long uploadReadyPoster() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }

    private FileReference findPosterReference(long performanceId, long fileId) {
        return fileReferenceRepository.findByReferenceTypeAndReferenceIdAndFileId(
                "PERFORMANCE_POSTER", performanceId, fileId
        ).orElseThrow();
    }
}
