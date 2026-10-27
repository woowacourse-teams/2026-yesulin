package art.yesulin.actor.application.photolibrary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.page.ActorPageContentState;
import art.yesulin.actor.application.page.ActorPageContentSync;
import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.page.PublicPhotoCopyStorage;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageAutoHiddenReason;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.page.ActorPageStatus;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryErrorCode;
import art.yesulin.actor.domain.photolibrary.PhotoPublicCopyUploadRepository;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.FileUploadCommand;
import art.yesulin.file.application.FileUploadResult;
import art.yesulin.file.domain.FileErrorCode;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.FakePublicObjectCache;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** 사본 삭제는 커밋 뒤에 일어나므로 테스트 전체를 한 트랜잭션으로 묶지 않고 요청마다 커밋한다. 테스트마다 새 배우를 쓴다. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:photo-public-copy-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class PhotoPublicCopyServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T00:00:00Z");
    private static final LocalDate BIRTH = LocalDate.of(2000, 1, 1);
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n'};

    @Autowired
    private MemberRepository members;
    @Autowired
    private ApplicantProfileService profiles;
    @Autowired
    private ActorPageService pages;
    @Autowired
    private ActorPageRepository pageRepository;
    @Autowired
    private ActorPageContentSync contentSync;
    @Autowired
    private PhotoLibraryService photos;
    @Autowired
    private PhotoPublicCopyService copies;
    @Autowired
    private PhotoPublicCopyUploadRepository uploads;
    @Autowired
    private FileService files;
    @Autowired
    private FakeObjectStorage storage;
    @Autowired
    private FakePublicObjectCache cache;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @MockitoBean
    private Clock clock;

    private long owner;

    @BeforeEach
    void setUp() {
        when(clock.instant()).thenReturn(NOW);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.withZone(any())).thenAnswer(invocation -> Clock.fixed(clock.instant(), invocation.getArgument(0)));
        owner = members.saveAndFlush(Member.ofApplicant()).getId();
    }

    @Test
    void completesJpegCopyWithShortCacheAndKeepsOriginalPrivate() {
        long photoId = publicPhoto();

        PhotoLibraryItemResult result = copy(photoId);

        String key = copyKey(photoId);
        assertTrue(key.startsWith("public/files/actor-pages/20261027/"));
        assertEquals(PublicPhotoCopyStorage.CACHE_CONTROL, storage.cacheControl(key));
        assertEquals(storage.toPublicUrl(key), result.publicCopyUrl());
        assertEquals("/api/v1/files/" + result.fileId() + "/content", result.imageUrl());
        assertTrue(uploads.findByObjectKey(key).isEmpty());
    }

    @Test
    void rejectsPrivatePhotoNonJpegTypeAndNonJpegContent() {
        long photoId = addPhoto();
        assertError(PhotoLibraryErrorCode.PHOTO_NOT_PUBLIC,
                () -> copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length));
        photos.changeVisibility(owner, photoId, PhotoVisibility.PUBLIC);
        assertError(PhotoLibraryErrorCode.INVALID_PUBLIC_COPY,
                () -> copies.prepareUpload(owner, photoId, "image/png", PNG.length));

        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", PNG.length);
        storage.upload(upload.url(), "image/jpeg", PNG);

        assertError(FileErrorCode.METADATA_MISMATCH, () -> copies.complete(owner, photoId, upload.uploadKey()));
        assertNull(copyKey(photoId));
    }

    @Test
    void rejectsUploadKeyPreparedForAnotherPhotoOrActor() {
        long photoId = publicPhoto();
        long otherPhotoId = publicPhoto();
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);

        assertError(PhotoLibraryErrorCode.INVALID_PUBLIC_COPY,
                () -> copies.complete(owner, otherPhotoId, upload.uploadKey()));
        long stranger = members.saveAndFlush(Member.ofApplicant()).getId();
        assertError(PhotoLibraryErrorCode.PHOTO_NOT_FOUND,
                () -> copies.complete(stranger, photoId, upload.uploadKey()));
        assertNull(copyKey(otherPhotoId));
    }

    @Test
    void repeatedCompletionWithSameKeyRestoresShortCache() {
        long photoId = publicPhoto();
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);
        copies.complete(owner, photoId, upload.uploadKey());
        storage.upload(upload.url(), "image/jpeg", JPEG);

        PhotoLibraryItemResult again = copies.complete(owner, photoId, upload.uploadKey());

        assertEquals(storage.toPublicUrl(upload.uploadKey()), again.publicCopyUrl());
        assertEquals(PublicPhotoCopyStorage.CACHE_CONTROL, storage.cacheControl(upload.uploadKey()));
    }

    @Test
    void replacedPrivatePhotoAndDeletedPhotoCopiesAreRemovedAfterCommit() {
        long first = publicPhoto();
        final long second = publicPhoto();
        copy(first);
        String replaced = copyKey(first);
        copy(first);
        assertRemoved(replaced);

        String current = copyKey(first);
        photos.changeVisibility(owner, first, PhotoVisibility.PRIVATE);
        assertRemoved(current);
        assertNull(copyKey(first));

        copy(second);
        String deleted = copyKey(second);
        photos.deletePhoto(owner, second);
        assertRemoved(deleted);
    }

    @Test
    void copiesMadeBeforePublishingStayWhilePageIsPrivate() {
        long photoId = publicPhoto();
        copy(photoId);
        String key = copyKey(photoId);

        profiles.update(owner, basic("배우", BIRTH));
        pages.unpublish(owner);

        assertTrue(storage.contains(key));
        assertEquals(key, copyKey(photoId));
    }

    @Test
    void unpublishingRemovesEveryCopy() {
        long first = readyPage();
        long second = publicPhoto();
        copy(second);
        String firstKey = copyKey(first);
        String secondKey = copyKey(second);

        pages.unpublish(owner);

        assertRemoved(firstKey);
        assertRemoved(secondKey);
        assertNull(copyKey(first));
        assertNull(copyKey(second));
    }

    @Test
    void automaticHidingRemovesEveryCopy() {
        long photoId = readyPage();
        String key = copyKey(photoId);

        profiles.update(owner, basic(null, BIRTH));

        ActorPage page = pageRepository.findByOwnerMemberId(owner).orElseThrow();
        assertEquals(ActorPageAutoHiddenReason.MISSING_REQUIRED, page.getAutoHiddenReason());
        assertRemoved(key);
    }

    @Test
    void adminLockRemovesEveryCopy() {
        long photoId = readyPage();
        final String key = copyKey(photoId);

        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            ActorPageContentState state = contentSync.lock(owner);
            state.page().lock("사진 확인이 필요합니다.", 1L, NOW);
            contentSync.synchronize(state);
        });

        ActorPage page = pageRepository.findByOwnerMemberId(owner).orElseThrow();
        assertTrue(page.isLocked());
        assertEquals(ActorPageStatus.PRIVATE, page.getStatus());
        assertRemoved(key);
        assertNull(copyKey(photoId));
    }

    @Test
    void deletesUnclaimedUploadsAfterOneDay() {
        long photoId = publicPhoto();
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);

        copies.deleteUnclaimed();
        assertTrue(storage.contains(upload.uploadKey()));

        when(clock.instant()).thenReturn(NOW.plus(Duration.ofDays(1)).plusSeconds(1));
        copies.deleteUnclaimed();
        assertFalse(storage.contains(upload.uploadKey()));
        assertTrue(uploads.findByObjectKey(upload.uploadKey()).isEmpty());
    }

    private long readyPage() {
        profiles.update(owner, basic("배우", BIRTH));
        pages.changeHandle(owner, "actor" + owner);
        long photoId = publicPhoto();
        copy(photoId);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        return photoId;
    }

    private long publicPhoto() {
        long photoId = addPhoto();
        photos.changeVisibility(owner, photoId, PhotoVisibility.PUBLIC);
        return photoId;
    }

    private long addPhoto() {
        FileUploadResult upload = files.requestPrivateActorPhotoUpload(
                owner, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        storage.upload(upload.uploadUrl(), "image/png", 1_024L);
        files.completeUpload(owner, upload.fileId());
        return photos.addPhoto(owner, new AddPhotoToLibraryCommand(upload.fileId())).id();
    }

    private PhotoLibraryItemResult copy(long photoId) {
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);
        return copies.complete(owner, photoId, upload.uploadKey());
    }

    /** 가짜 저장소의 공개 주소({@code https://cdn.test/assets/...})에서 저장소 키를 되찾는다. */
    private String copyKey(long photoId) {
        String url = photos.findPhotos(owner).photos().stream()
                .filter(photo -> photo.id() == photoId)
                .findFirst().orElseThrow()
                .publicCopyUrl();
        return url == null ? null : "public/" + url.substring("https://cdn.test/assets/".length());
    }

    private void assertRemoved(String objectKey) {
        assertFalse(storage.contains(objectKey));
        assertTrue(cache.evicted().contains(objectKey));
    }

    private static void assertError(Object errorCode, Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(errorCode, exception.getErrorCode());
    }

    private UpdateApplicantProfileCommand basic(String name, LocalDate birth) {
        return new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                name, null, null, birth, ProfileGender.FEMALE, null, null, null
        ), null);
    }
}
