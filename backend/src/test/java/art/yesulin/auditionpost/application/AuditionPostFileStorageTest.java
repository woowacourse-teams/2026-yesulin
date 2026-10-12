package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AuditionPostFileStorageTest {

    /** 한국 날짜로는 10월 12일이지만 키는 UTC 날짜를 쓴다. */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-11T23:30:00Z"), ZoneOffset.UTC);

    private final RecordingObjectStorage objectStorage = new RecordingObjectStorage();
    private final AuditionPostFileStorage fileStorage = new AuditionPostFileStorage(objectStorage, CLOCK);

    @Test
    void storesImageUnderAuditionPostPathWithoutDownloadName() {
        AuditionPostFile file = fileStorage.store(AuditionPostFileKind.IMAGE, "포스터.png", "image/png", 3, content(3));

        assertTrue(file.getObjectKey().matches("public/audition-posts/20261011/[0-9a-f-]{36}"));
        assertEquals(
                new AuditionPostFile(AuditionPostFileKind.IMAGE, file.getObjectKey(), "포스터.png", "image/png", 3),
                file
        );
        ObjectUpload upload = objectStorage.uploads.get(file.getObjectKey());
        assertEquals("image/png", upload.contentType());
        assertEquals(3, upload.size());
        assertNull(upload.contentDisposition());
    }

    @Test
    void storesAttachmentAsDownloadWithOriginalName() {
        AuditionPostFile file = fileStorage.store(
                AuditionPostFileKind.ATTACHMENT, "지원서.hwp", "application/x-hwp", 5, content(5)
        );

        assertFalse(file.isImage());
        assertEquals(
                AuditionPostFileRules.attachmentDisposition("지원서.hwp"),
                objectStorage.uploads.get(file.getObjectKey()).contentDisposition()
        );
    }

    @Test
    void doesNotUploadInvalidFile() {
        assertThrows(
                BusinessException.class,
                () -> fileStorage.store(AuditionPostFileKind.IMAGE, " ", "image/png", 3, content(3))
        );
        assertEquals(0, objectStorage.objectCount());
    }

    @Test
    void confirmsBrowserUploadAndAddsDownloadName() {
        AuditionPostFileStorage.PreparedUpload prepared = fileStorage.prepareUpload(
                AuditionPostFileKind.ATTACHMENT, "지원서.hwp", "application/x-hwp", 5
        );
        AuditionPostFile file = prepared.file();

        assertFalse(fileStorage.confirmUpload(file));
        objectStorage.upload(prepared.upload().url(), "application/x-hwp", 4);
        assertFalse(fileStorage.confirmUpload(file));
        objectStorage.upload(prepared.upload().url(), "application/x-hwp", 5);

        assertTrue(fileStorage.confirmUpload(file));
        assertEquals(
                AuditionPostFileRules.attachmentDisposition("지원서.hwp"),
                objectStorage.contentDisposition(file.getObjectKey())
        );
    }

    @Test
    void findsObjectKeyOnlyFromOwnPublicUrl() {
        String objectKey = fileStorage.prepareUpload(AuditionPostFileKind.IMAGE, "a.png", "image/png", 1)
                .file().getObjectKey();

        assertEquals(Optional.of(objectKey), fileStorage.objectKeyOf(objectStorage.toPublicUrl(objectKey)));
        assertEquals(
                Optional.empty(),
                fileStorage.objectKeyOf("https://evil.test/assets/" + objectKey.replaceFirst("^public/", ""))
        );
        assertEquals(Optional.empty(), fileStorage.objectKeyOf("https://cdn.test/assets/files/a.png"));
    }

    @Test
    void keepsDeletingAfterOneFailure() {
        String first = storeImage("a.png");
        String second = storeImage("b.png");
        objectStorage.failNextDelete();

        fileStorage.deleteQuietly(List.of(first, second));

        assertTrue(objectStorage.contains(first));
        assertFalse(objectStorage.contains(second));
    }

    private String storeImage(String filename) {
        return fileStorage.store(AuditionPostFileKind.IMAGE, filename, "image/png", 1, content(1)).getObjectKey();
    }

    private static InputStream content(int size) {
        return new ByteArrayInputStream(new byte[size]);
    }

    private static class RecordingObjectStorage extends FakeObjectStorage {

        private final Map<String, ObjectUpload> uploads = new HashMap<>();

        @Override
        public void put(String objectKey, ObjectUpload upload) {
            uploads.put(objectKey, upload);
            super.put(objectKey, upload);
        }
    }
}
