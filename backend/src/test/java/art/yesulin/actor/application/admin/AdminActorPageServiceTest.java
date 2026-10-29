package art.yesulin.actor.application.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.page.ActorPageSettingsResult;
import art.yesulin.actor.application.page.PublicActorPageResult;
import art.yesulin.actor.application.page.PublicActorPageService;
import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyUploadResult;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.application.videolibrary.AddVideoToLibraryCommand;
import art.yesulin.actor.application.videolibrary.VideoLibraryService;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.page.ActorPageStatus;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.FileUploadCommand;
import art.yesulin.file.application.FileUploadResult;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-actor-page-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class AdminActorPageServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-28T00:00:00Z");
    private static final long ADMIN = 99L;
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};

    @Autowired
    private AdminActorPageService admin;
    @Autowired
    private ActorPageService pages;
    @Autowired
    private PublicActorPageService publicPages;
    @Autowired
    private ActorPageRepository pageRepository;
    @Autowired
    private AdminAuditLogRepository auditLogs;
    @Autowired
    private MemberRepository members;
    @Autowired
    private ApplicantProfileService profiles;
    @Autowired
    private PhotoLibraryService photos;
    @Autowired
    private PhotoPublicCopyService copies;
    @Autowired
    private VideoLibraryService videos;
    @Autowired
    private FileService files;
    @Autowired
    private FakeObjectStorage storage;
    @MockitoBean
    private Clock clock;

    @BeforeEach
    void fixTime() {
        when(clock.instant()).thenReturn(NOW);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.withZone(any())).thenAnswer(invocation -> Clock.fixed(NOW, invocation.getArgument(0)));
    }

    @Test
    void detailAddsProducerOnlyVideosAndContactToThePublicContent() {
        final long owner = publicActor("actor");
        final long publicVideo = videos.addVideo(owner, new AddVideoToLibraryCommand(youtube("aaaaaaaaaaa"))).id();
        videos.addVideo(owner, new AddVideoToLibraryCommand(youtube("bbbbbbbbbbb")));
        videos.changeVisibility(owner, publicVideo, VideoVisibility.PUBLIC);

        AdminActorPageResult detail = admin.find(publicIdOf(owner));

        assertEquals("actor", detail.handle());
        assertEquals(List.of("aaaaaaaaaaa"),
                detail.content().videos().stream().map(PublicActorPageResult.Video::youtubeId).toList());
        assertEquals(List.of("bbbbbbbbbbb"),
                detail.producerOnlyVideos().stream().map(PublicActorPageResult.Video::youtubeId).toList());
        assertEquals("010-1234-5678", detail.phone());
        assertEquals("actor@example.com", detail.email());
        assertEquals(1, detail.content().photos().size());
    }

    @Test
    void lockHidesThePageUntilUnlockedAndTheActorPublishesAgain() {
        long owner = publicActor("actor");
        UUID publicId = publicIdOf(owner);

        AdminActorPageResult locked = admin.lock(ADMIN, publicId, "다른 사람의 사진이라는 문의가 있어 확인 중입니다.");

        assertTrue(locked.locked());
        assertEquals(ActorPageStatus.PRIVATE, locked.status());
        assertTrue(locked.content().photos().isEmpty());
        assertEquals("actor", locked.handle());
        assertThrows(BusinessException.class, () -> publicPages.findByHandle("actor"));
        ActorPageSettingsResult settings = pages.find(owner);
        assertEquals("다른 사람의 사진이라는 문의가 있어 확인 중입니다.", settings.lockReason());

        AdminActorPageResult unlocked = admin.unlock(ADMIN, publicId);
        admin.unlock(ADMIN, publicId);

        assertFalse(unlocked.locked());
        assertEquals(ActorPageStatus.PRIVATE, unlocked.status());
        assertEquals(NOW, unlocked.unlockedAt());
        assertEquals(List.of(AdminAction.ACTOR_PAGE_LOCKED, AdminAction.ACTOR_PAGE_UNLOCKED), actions());
        assertEquals("@actor 잠금", auditLogs.findAll().getFirst().getDetail());
    }

    @Test
    void adminChangesHandleAfterFirstPublishAndReleasesTheOldOne() {
        final long owner = publicActor("old.handle");
        final long other = actor();

        AdminActorPageResult changed = admin.changeHandle(ADMIN, publicIdOf(owner), "New.Handle");

        assertEquals("new.handle", changed.handle());
        assertEquals("new.handle", publicPages.findByHandle("new.handle").handle());
        assertThrows(BusinessException.class, () -> publicPages.findByHandle("old.handle"));
        assertEquals("old.handle", pages.changeHandle(other, "old.handle").handle());
        assertEquals("아이디 변경 @old.handle → @new.handle", auditLogs.findAll().getFirst().getDetail());
    }

    @Test
    void adminHandleChangeKeepsTheHandleRules() {
        long owner = publicActor("actor");
        long other = actor();
        pages.changeHandle(other, "taken");
        UUID publicId = publicIdOf(owner);

        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_TAKEN, handleChangeError(publicId, "taken"));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_INVALID, handleChangeError(publicId, "a..b"));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_RESERVED, handleChangeError(publicId, "admin"));
        admin.changeHandle(ADMIN, publicId, "actor");
        assertTrue(auditLogs.findAll().isEmpty());
    }

    @Test
    void listFindsByPartOfHandleWithNames() {
        publicActor("min.zzun_");
        long other = actor();
        pages.changeHandle(other, "harin");

        AdminActorPagePageResult result = admin.findPage(" ZZUN ", 0, 20);

        assertEquals(1, result.totalElements());
        AdminActorPageSummaryResult row = result.actorPages().getFirst();
        assertEquals("min.zzun_", row.handle());
        assertEquals("배우", row.name());
        assertEquals(ActorPageStatus.PUBLIC, row.status());
        assertEquals(2, admin.findPage(null, 0, 20).totalElements());
        assertNull(admin.findPage("nobody", 0, 20).actorPages().stream().findFirst().orElse(null));
    }

    @Test
    void unknownPageIsNotFound() {
        assertEquals(ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND, errorOf(() -> admin.find(UUID.randomUUID())));
        assertThrows(IllegalArgumentException.class,
                () -> admin.findPage(null, 0, AdminActorPageService.MAX_PAGE_SIZE + 1));
    }

    private long publicActor(String handle) {
        long owner = actor();
        long photoId = addPhoto(owner);
        photos.changeVisibility(owner, photoId, PhotoVisibility.PUBLIC);
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);
        copies.complete(owner, photoId, upload.uploadKey());
        pages.changeHandle(owner, handle);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        return owner;
    }

    private long actor() {
        long owner = members.saveAndFlush(Member.ofApplicant()).getId();
        profiles.update(owner, new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                "배우", 170, null, LocalDate.of(2000, 1, 1), ProfileGender.FEMALE, "010-1234-5678",
                "actor@example.com", "서울"
        ), null));
        return owner;
    }

    private long addPhoto(long owner) {
        FileUploadResult upload = files.requestPrivateActorPhotoUpload(
                owner, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        storage.upload(upload.uploadUrl(), "image/png", 1_024L);
        files.completeUpload(owner, upload.fileId());
        return photos.addPhoto(owner, new AddPhotoToLibraryCommand(upload.fileId())).id();
    }

    private UUID publicIdOf(long owner) {
        return pageRepository.findByOwnerMemberId(owner).orElseThrow().getPublicId();
    }

    private List<AdminAction> actions() {
        return auditLogs.findAll().stream().map(AdminAuditLog::getAction).toList();
    }

    private Object handleChangeError(UUID publicId, String handle) {
        return errorOf(() -> admin.changeHandle(ADMIN, publicId, handle));
    }

    private static Object errorOf(Runnable action) {
        return assertThrows(BusinessException.class, action::run).getErrorCode();
    }

    private static String youtube(String id) {
        return "https://www.youtube.com/watch?v=" + id;
    }
}
