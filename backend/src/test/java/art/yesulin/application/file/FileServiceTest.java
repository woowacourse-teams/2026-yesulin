package art.yesulin.application.file;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileErrorCode;
import art.yesulin.domain.file.FileStatus;
import art.yesulin.domain.file.FileType;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:file;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class FileServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private FileService fileService;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanUp() {
        fileAssetRepository.deleteAll();
    }

    @Test
    void storesPendingImageAndCreatesBrowsableObjectKey() {
        FileUploadResult upload = requestPosterUpload();
        FileAsset fileAsset = fileAssetRepository.findById(upload.fileId()).orElseThrow();

        String status = jdbcTemplate.queryForObject(
                "select status from file_assets where id = ?", String.class, upload.fileId()
        );
        String fileType = jdbcTemplate.queryForObject(
                "select file_type from file_assets where id = ?", String.class, upload.fileId()
        );
        assertEquals("PENDING", status);
        assertEquals("IMAGE", fileType);
        assertEquals(FileType.IMAGE, fileAsset.getMetadata().getType());
        assertEquals(OWNER_ID, fileAsset.getOwnerId());
        assertTrue(fileAsset.getObjectKey().matches("public/files/\\d{8}/[0-9a-f-]{36}"));
    }

    @Test
    void completesSingleImageAfterStorageMetadataVerification() {
        FileUploadResult upload = requestPosterUpload();
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);

        fileService.completeUpload(OWNER_ID, upload.fileId());

        FileAsset found = fileAssetRepository.findById(upload.fileId()).orElseThrow();
        assertEquals(FileStatus.READY, found.getStatus());
    }

    @Test
    void rejectsUploadedImageWithDifferentMetadata() {
        FileUploadResult upload = requestPosterUpload();
        objectStorage.upload(upload.uploadUrl(), "image/jpeg", 1_024L);

        BusinessException exception = assertThrows(
                BusinessException.class, () -> fileService.completeUpload(OWNER_ID, upload.fileId())
        );

        assertEquals(FileErrorCode.METADATA_MISMATCH, exception.getErrorCode());
    }

    @Test
    void logsExpectedAndActualMetadataWhenZeroByteObjectIsRejected() {
        FileUploadResult upload = requestPosterUpload();
        objectStorage.upload(upload.uploadUrl(), "image/png", 0L);
        Logger logger = (Logger) LoggerFactory.getLogger(FileService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            BusinessException exception = assertThrows(
                    BusinessException.class, () -> fileService.completeUpload(OWNER_ID, upload.fileId())
            );

            assertEquals(FileErrorCode.METADATA_MISMATCH, exception.getErrorCode());
            String log = appender.list.getFirst().getFormattedMessage();
            assertTrue(log.contains("fileId=" + upload.fileId()));
            assertTrue(log.contains("expectedSize=1024"));
            assertTrue(log.contains("actualSize=0"));
            assertTrue(log.contains("expectedContentType=image/png"));
            assertTrue(log.contains("actualContentType=image/png"));
            assertTrue(!log.contains("hamlet.png"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void rejectsCompletionWhenImageWasNotUploaded() {
        FileUploadResult upload = requestPosterUpload();

        BusinessException exception = assertThrows(
                BusinessException.class, () -> fileService.completeUpload(OWNER_ID, upload.fileId())
        );

        assertEquals(FileErrorCode.UPLOAD_NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void rejectsUnsupportedFileType() {
        BusinessException exception = assertThrows(BusinessException.class, () -> fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.pdf", "application/pdf", 1_024L)
        ));

        assertEquals(FileErrorCode.UNSUPPORTED_CONTENT_TYPE, exception.getErrorCode());
    }

    @Test
    void allowsRepeatedCompletion() {
        FileUploadResult upload = requestPosterUpload();
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());

        fileService.completeUpload(OWNER_ID, upload.fileId());

        FileAsset found = fileAssetRepository.findById(upload.fileId()).orElseThrow();
        assertEquals(FileStatus.READY, found.getStatus());
    }

    @Test
    void hidesAnotherOwnersFile() {
        FileUploadResult upload = requestPosterUpload();

        BusinessException exception = assertThrows(
                BusinessException.class, () -> fileService.completeUpload(OWNER_ID + 1, upload.fileId())
        );

        assertEquals(FileErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    private FileUploadResult requestPosterUpload() {
        return fileService.requestUpload(OWNER_ID, new FileUploadCommand("hamlet.png", "image/png", 1_024L));
    }
}
