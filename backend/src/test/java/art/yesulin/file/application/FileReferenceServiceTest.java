package art.yesulin.file.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.file.domain.FileErrorCode;
import art.yesulin.file.domain.FileReference;
import art.yesulin.file.domain.FileReferenceRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:file-reference;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class FileReferenceServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private FileService fileService;

    @Autowired
    private FileReferenceService fileReferenceService;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanUp() {
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void linksAndReplacesFile() {
        FileUploadResult firstUpload = requestReadyUpload();
        FileUploadResult secondUpload = requestReadyUpload();
        LinkFileCommand linkCommand = new LinkFileCommand(
                OWNER_ID, firstUpload.fileId(), "PERFORMANCE_POSTER", 1L
        );
        ReplaceLinkedFileCommand replaceCommand = new ReplaceLinkedFileCommand(
                OWNER_ID, firstUpload.fileId(), secondUpload.fileId(), "PERFORMANCE_POSTER", 1L
        );

        fileReferenceService.linkFile(linkCommand);
        fileReferenceService.linkFile(linkCommand);
        fileReferenceService.replaceLinkedFile(replaceCommand);
        fileReferenceService.replaceLinkedFile(replaceCommand);

        FileReference reference = fileReferenceRepository.findByReferenceTypeAndReferenceIdAndFileId(
                "PERFORMANCE_POSTER", 1L, secondUpload.fileId()
        ).orElseThrow();
        assertEquals(1, fileReferenceRepository.count());
        assertEquals(secondUpload.fileId(), reference.getFileId());
    }

    @Test
    void linksMultipleFilesToTheSameReferenceType() {
        FileUploadResult firstUpload = requestReadyUpload();
        FileUploadResult secondUpload = requestReadyUpload();
        LinkFileCommand firstCommand = new LinkFileCommand(
                OWNER_ID, firstUpload.fileId(), "SUBMISSION_PHOTO", 1L
        );
        LinkFileCommand secondCommand = new LinkFileCommand(
                OWNER_ID, secondUpload.fileId(), "SUBMISSION_PHOTO", 1L
        );

        fileReferenceService.linkFile(firstCommand);
        fileReferenceService.linkFile(secondCommand);

        assertEquals(2, fileReferenceRepository.count());
        assertTrue(fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(
                "SUBMISSION_PHOTO", 1L, firstUpload.fileId()
        ));
        assertTrue(fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(
                "SUBMISSION_PHOTO", 1L, secondUpload.fileId()
        ));
    }

    @Test
    void rejectsLinkingPendingFile() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("hamlet.png", "image/png", 1_024L)
        );

        LinkFileCommand command = new LinkFileCommand(OWNER_ID, upload.fileId(), "PERFORMANCE_POSTER", 1L);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> fileReferenceService.linkFile(command)
        );

        assertEquals(FileErrorCode.NOT_READY, exception.getErrorCode());
    }

    @Test
    void unlinkRestartsReadyFilesUnusedPeriod() {
        FileUploadResult upload = requestReadyUpload();
        UnlinkFileCommand command = new UnlinkFileCommand(upload.fileId(), "PERFORMANCE_POSTER", 1L);
        fileReferenceService.linkFile(new LinkFileCommand(OWNER_ID, upload.fileId(), "PERFORMANCE_POSTER", 1L));
        jdbcTemplate.update("update file_assets set unreferenced_at = ? where id = ?",
                Timestamp.from(Instant.parse("2026-01-01T00:00:00Z")), upload.fileId());
        Instant beforeUnlink = Instant.now().minusSeconds(1);

        // when
        fileReferenceService.unlinkFile(command);

        // then
        Instant unreferencedAt = jdbcTemplate.queryForObject(
                "select unreferenced_at from file_assets where id = ?",
                (resultSet, rowNum) -> resultSet.getTimestamp(1).toInstant(), upload.fileId());
        assertTrue(unreferencedAt.isAfter(beforeUnlink));
    }

    private FileUploadResult requestReadyUpload() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("hamlet.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload;
    }
}
