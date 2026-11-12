package art.yesulin.actor.application.cheer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.cheer.ActorPageLikesResult.Viewer;
import art.yesulin.actor.application.page.ActorPageContentState;
import art.yesulin.actor.application.page.ActorPageContentSync;
import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyUploadResult;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.domain.cheer.ActorCheerErrorCode;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.FileUploadCommand;
import art.yesulin.file.application.FileUploadResult;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:actor-page-like-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class ActorPageLikeServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-12T00:00:00Z");
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};

    @Autowired
    private ActorPageLikeService likes;
    @Autowired
    private ActorPageRepository pageRepository;
    @Autowired
    private MemberRepository members;
    @Autowired
    private ActorPageService pages;
    @Autowired
    private ActorPageContentSync contentSync;
    @Autowired
    private ApplicantProfileService profiles;
    @Autowired
    private PhotoLibraryService photos;
    @Autowired
    private PhotoPublicCopyService copies;
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
        when(clock.withZone(any())).thenAnswer(invocation -> Clock.fixed(clock.instant(), invocation.getArgument(0)));
    }

    @Test
    void likingTwiceCountsOnceAndUnlikingTwiceIsHarmless() {
        UUID page = publicPage("target").publicId();
        MemberPrincipal fan = fan();

        likes.like(fan, page);
        ActorPageLikesResult liked = likes.like(fan, page);

        assertEquals(1, liked.count());
        assertTrue(liked.viewer().liked());
        likes.unlike(fan, page);
        ActorPageLikesResult unliked = likes.unlike(fan, page);
        assertEquals(0, unliked.count());
        assertFalse(unliked.viewer().liked());
    }

    @Test
    void countsLikesOfDifferentFansButShowsOnlyMyState() {
        UUID page = publicPage("target").publicId();
        MemberPrincipal first = fan();
        MemberPrincipal second = fan();
        likes.like(first, page);
        likes.like(second, page);

        assertEquals(2, likes.findLikes(page, null).count());
        assertTrue(likes.findLikes(page, first).viewer().liked());
        likes.unlike(first, page);
        assertFalse(likes.findLikes(page, first).viewer().liked());
        assertTrue(likes.findLikes(page, second).viewer().liked());
        assertEquals(1, likes.findLikes(page, null).count());
    }

    @Test
    void ownerCannotLikeOwnPage() {
        PublicPage page = publicPage("target");
        MemberPrincipal owner = principal(page.ownerId(), MemberType.APPLICANT, MemberStatus.ACTIVE);

        BusinessException exception = assertThrows(BusinessException.class, () -> likes.like(owner, page.publicId()));

        assertEquals(ActorCheerErrorCode.ACTOR_PAGE_SELF_LIKE, exception.getErrorCode());
        assertEquals(new Viewer(true, true, false, false), likes.findLikes(page.publicId(), owner).viewer());
        assertEquals(0, likes.findLikes(page.publicId(), owner).count());
    }

    @Test
    void viewerStateDependsOnLoginAndAccount() {
        UUID page = publicPage("target").publicId();
        MemberPrincipal producer = principal(newMember(MemberType.PRODUCER), MemberType.PRODUCER, MemberStatus.ACTIVE);
        MemberPrincipal pending = principal(
                newMember(MemberType.APPLICANT), MemberType.APPLICANT, MemberStatus.PENDING
        );

        assertEquals(new Viewer(false, false, false, false), likes.findLikes(page, null).viewer());
        assertEquals(new Viewer(true, false, false, false), likes.findLikes(page, producer).viewer());
        assertEquals(new Viewer(true, false, false, false), likes.findLikes(page, pending).viewer());
        assertEquals(new Viewer(true, false, true, false), likes.findLikes(page, fan()).viewer());
    }

    @Test
    void pagesNotOpenToEveryoneAnswerNotFoundForReadAndWrite() {
        PublicPage hidden = publicPage("hidden");
        pages.unpublish(hidden.ownerId());
        PublicPage locked = publicPage("locked");
        ActorPageContentState state = contentSync.lock(locked.ownerId());
        state.page().lock("확인이 필요합니다.", 1L, NOW);
        contentSync.synchronize(state);
        MemberPrincipal fan = fan();

        for (UUID publicId : new UUID[] {hidden.publicId(), locked.publicId(), UUID.randomUUID()}) {
            assertNotFound(() -> likes.findLikes(publicId, fan));
            assertNotFound(() -> likes.like(fan, publicId));
            assertNotFound(() -> likes.unlike(fan, publicId));
        }
    }

    private void assertNotFound(Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND, exception.getErrorCode());
    }

    private MemberPrincipal fan() {
        return principal(newMember(MemberType.APPLICANT), MemberType.APPLICANT, MemberStatus.ACTIVE);
    }

    private long newMember(MemberType type) {
        return members.saveAndFlush(new Member(null, null, type, MemberStatus.ACTIVE)).getId();
    }

    private static MemberPrincipal principal(long id, MemberType type, MemberStatus status) {
        return new MemberPrincipal(id, type, status);
    }

    private PublicPage publicPage(String handle) {
        long owner = members.saveAndFlush(Member.ofApplicant()).getId();
        profiles.update(owner, new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                "배우", 170, null, LocalDate.of(2000, 10, 28), ProfileGender.FEMALE, "010-1234-5678",
                "actor@example.com", "서울"
        ), null));
        long photoId = addPhoto(owner);
        photos.changeVisibility(owner, photoId, PhotoVisibility.PUBLIC);
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);
        copies.complete(owner, photoId, upload.uploadKey());
        pages.changeHandle(owner, handle);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        return new PublicPage(owner, pageRepository.findByOwnerMemberId(owner).orElseThrow().getPublicId());
    }

    private long addPhoto(long owner) {
        FileUploadResult upload = files.requestPrivateActorPhotoUpload(
                owner, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        storage.upload(upload.uploadUrl(), "image/png", 1_024L);
        files.completeUpload(owner, upload.fileId());
        return photos.addPhoto(owner, new AddPhotoToLibraryCommand(upload.fileId())).id();
    }

    private record PublicPage(long ownerId, UUID publicId) {
    }
}
