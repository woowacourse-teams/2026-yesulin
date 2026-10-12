package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.upload.AuditionPostUpload;
import art.yesulin.auditionpost.domain.upload.AuditionPostUploadRepository;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.ByteArrayInputStream;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-post-import;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AuditionPostImportServiceTest.FakeSourceConfiguration.class})
class AuditionPostUploadServiceTest {

    private static final long ADMIN_ID = 1L;

    @Autowired
    private AuditionPostUploadService uploadService;

    @Autowired
    private AuditionPostUploadRepository repository;

    @Autowired
    private FakeObjectStorage storage;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
    }

    @Test
    void decidesContentTypeAndSignsOnlyIt() {
        AuditionPostUploadResult image = uploadService.prepare(ADMIN_ID, AuditionPostFileKind.IMAGE, "a.jpg", "", 10);
        AuditionPostUploadResult attachment = uploadService.prepare(
                ADMIN_ID, AuditionPostFileKind.ATTACHMENT, "지원서.HWP", "application/octet-stream", 10
        );

        assertEquals("image/jpeg", image.headers().get("Content-Type"));
        assertEquals("application/x-hwp", attachment.headers().get("Content-Type"));
        assertEquals(1, attachment.headers().size());
        assertTrue(image.publicUrl().startsWith("https://cdn.test/assets/audition-posts/"));
        assertEquals(2, repository.count());
    }

    @Test
    void rejectsUnsupportedOrTooLargeFiles() {
        assertCode(() -> uploadService.prepare(ADMIN_ID, AuditionPostFileKind.IMAGE, "a.bmp", "image/bmp", 10));
        assertCode(() -> uploadService.prepare(ADMIN_ID, AuditionPostFileKind.ATTACHMENT, "setup.exe", "", 10));
        assertCode(() -> uploadService.prepare(
                ADMIN_ID, AuditionPostFileKind.IMAGE, "a.png", "image/png", AuditionPostFileRules.MAX_IMAGE_BYTES + 1
        ));
        assertEquals(0, repository.count());
    }

    @Test
    void deletesUploadsLeftUnclaimedForOneDay() {
        AuditionPostFile old = file("public/audition-posts/20261001/00000000-0000-0000-0000-000000000001");
        AuditionPostFile recent = file("public/audition-posts/20261001/00000000-0000-0000-0000-000000000002");
        put(old);
        put(recent);
        repository.save(new AuditionPostUpload(
                old, ADMIN_ID, Instant.now().minus(AuditionPostUploadService.UNCLAIMED_RETENTION).minusSeconds(60)
        ));
        repository.save(new AuditionPostUpload(recent, ADMIN_ID, Instant.now()));

        assertEquals(1, uploadService.deleteUnclaimed());

        assertFalse(storage.contains(old.getObjectKey()));
        assertTrue(storage.contains(recent.getObjectKey()));
        assertEquals(1, repository.count());
    }

    private void put(AuditionPostFile file) {
        storage.put(file.getObjectKey(), new ObjectUpload(
                file.getContentType(), null, file.getSize(), new ByteArrayInputStream(new byte[(int) file.getSize()])
        ));
    }

    private static AuditionPostFile file(String objectKey) {
        return new AuditionPostFile(AuditionPostFileKind.IMAGE, objectKey, "a.png", "image/png", 10);
    }

    private static void assertCode(Executable executable) {
        BusinessException exception = assertThrows(BusinessException.class, executable);
        assertEquals(AuditionPostErrorCode.FILE_REJECTED, exception.getErrorCode());
    }
}
