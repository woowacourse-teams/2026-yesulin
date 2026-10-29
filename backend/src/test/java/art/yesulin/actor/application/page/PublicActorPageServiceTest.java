package art.yesulin.actor.application.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.page.PublicActorPageResult.Career;
import art.yesulin.actor.application.page.PublicActorPageResult.CareerGroup;
import art.yesulin.actor.application.page.PublicActorPageResult.Link;
import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyUploadResult;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileAdditionalInformationCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.application.profile.UpdateProfileCareerCommand;
import art.yesulin.actor.application.videolibrary.AddVideoToLibraryCommand;
import art.yesulin.actor.application.videolibrary.VideoLibraryService;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPageField;
import art.yesulin.actor.domain.page.ActorPageVisibility;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profile.ProfileCareerGenre;
import art.yesulin.actor.domain.profile.ProfileEducationLevel;
import art.yesulin.actor.domain.profile.ProfileGender;
import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
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
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:public-actor-page-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class PublicActorPageServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-27T00:00:00Z");
    private static final LocalDate BIRTH = LocalDate.of(2000, 10, 28);
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};
    private static final ActorPageSearchCondition RECENT = new ActorPageSearchCondition(ActorPageSort.RECENT);

    @Autowired
    private MemberRepository members;
    @Autowired
    private PublicActorPageService publicPages;
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
    private VideoLibraryService videos;
    @Autowired
    private FileService files;
    @Autowired
    private FakeObjectStorage storage;
    @MockitoBean
    private Clock clock;

    @BeforeEach
    void fixTime() {
        at(NOW);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.withZone(any())).thenAnswer(invocation -> Clock.fixed(clock.instant(), invocation.getArgument(0)));
    }

    @Test
    void pageContainsOnlyItemsAnyoneMaySee() {
        final long owner = actor();
        addPhoto(owner);
        final long publicPhoto = publicPhotoWithCopy(owner);
        profiles.update(owner, new UpdateApplicantProfileCommand(null, new UpdateProfileAdditionalInformationCommand(
                ProfileEducationLevel.UNIVERSITY, "예술대학교", "연기", List.of("https://instagram.com/actor"),
                "대한민국", "무대에 서는 배우입니다.", "탭댄스", "등산", null,
                List.of(new UpdateProfileCareerCommand(2025, "햄릿", "오필리아", ProfileCareerGenre.THEATER))
        )));
        long publicVideo = videos.addVideo(owner, new AddVideoToLibraryCommand(youtube("aaaaaaaaaaa"))).id();
        videos.addVideo(owner, new AddVideoToLibraryCommand(youtube("bbbbbbbbbbb")));
        videos.changeVisibility(owner, publicVideo, VideoVisibility.PUBLIC);
        pages.changeVisibilities(owner, Map.of(
                ActorPageField.CAREERS, ActorPageVisibility.PUBLIC,
                ActorPageField.COVER_LETTER, ActorPageVisibility.PUBLIC,
                ActorPageField.LINKS, ActorPageVisibility.PUBLIC
        ));
        publish(owner, "actor");

        PublicActorPageResult page = publicPages.findByHandle("actor");

        assertEquals("배우", page.name());
        assertEquals(2000, page.birthYear());
        assertEquals(25, page.age());
        assertEquals(170, page.height());
        assertNull(page.weight());
        assertEquals(1, page.photos().size());
        assertEquals(page.photos().getFirst().url(), page.representativePhotoUrl());
        assertEquals(copyUrl(owner, publicPhoto), page.representativePhotoUrl());
        assertEquals(List.of("aaaaaaaaaaa"),
                page.videos().stream().map(PublicActorPageResult.Video::youtubeId).toList());
        assertEquals("무대에 서는 배우입니다.", page.coverLetter());
        assertEquals(List.of(new Link("https://instagram.com/actor")), page.links());
        assertEquals(1, page.careerGroups().size());
        assertNull(page.education());
        assertNull(page.specialty());
        assertNull(page.hobbies());
        assertNull(page.nationality());
    }

    @Test
    void careersAreGroupedByGenreWithUnclassifiedLastAndRecentYearFirst() {
        long owner = actor();
        publicPhotoWithCopy(owner);
        profiles.update(owner, new UpdateApplicantProfileCommand(null, new UpdateProfileAdditionalInformationCommand(
                null, null, null, List.of(), null, null, null, null, null, List.of(
                        new UpdateProfileCareerCommand(2023, "광고 A", "모델"),
                        new UpdateProfileCareerCommand(2021, "갈매기", "니나", ProfileCareerGenre.THEATER),
                        new UpdateProfileCareerCommand(2024, "레미제라블", "코제트", ProfileCareerGenre.MUSICAL),
                        new UpdateProfileCareerCommand(2024, "햄릿", "오필리아", ProfileCareerGenre.THEATER),
                        new UpdateProfileCareerCommand(2024, "벚꽃동산", "아냐", ProfileCareerGenre.THEATER)
                )
        )));
        pages.changeVisibilities(owner, Map.of(ActorPageField.CAREERS, ActorPageVisibility.PUBLIC));
        publish(owner, "actor");

        List<CareerGroup> groups = publicPages.findByHandle("actor").careerGroups();

        assertEquals(Arrays.asList(ProfileCareerGenre.THEATER, ProfileCareerGenre.MUSICAL, null),
                groups.stream().map(CareerGroup::genre).toList());
        assertEquals(List.of("햄릿", "벚꽃동산", "갈매기"),
                groups.getFirst().careers().stream().map(Career::title).toList());
    }

    @Test
    void uppercaseHandleFindsPageWithCanonicalHandle() {
        long owner = actor();
        publicPhotoWithCopy(owner);
        publish(owner, "min.zzun_");

        assertEquals("min.zzun_", publicPages.findByHandle("Min.Zzun_").handle());
    }

    @Test
    void pagesNotOpenToEveryoneAnswerTheSameNotFound() {
        long privateOwner = actor();
        publicPhotoWithCopy(privateOwner);
        pages.changeHandle(privateOwner, "private.actor");
        long lockedOwner = actor();
        publicPhotoWithCopy(lockedOwner);
        publish(lockedOwner, "locked.actor");
        ActorPageContentState state = contentSync.lock(lockedOwner);
        state.page().lock("확인이 필요합니다.", 1L, NOW);
        contentSync.synchronize(state);
        long hiddenOwner = actor();
        publicPhotoWithCopy(hiddenOwner);
        publish(hiddenOwner, "hidden.actor");
        profiles.update(hiddenOwner, basic(null));

        for (String handle : List.of("private.actor", "locked.actor", "hidden.actor", "nobody", "bad..handle", "")) {
            BusinessException exception = assertThrows(BusinessException.class, () -> publicPages.findByHandle(handle));
            assertEquals(ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND, exception.getErrorCode());
        }
    }

    @Test
    void listShowsOnlyPublicPagesByRecentPublicActivity() {
        final long first = actor();
        publicPhotoWithCopy(first);
        publish(first, "first");
        final long second = actor();
        publicPhotoWithCopy(second);
        at(NOW.plusSeconds(60));
        publish(second, "second");
        final long hidden = actor();
        publicPhotoWithCopy(hidden);
        publish(hidden, "hidden");
        pages.unpublish(hidden);
        at(NOW.plusSeconds(120));
        profiles.update(first, basic("새 이름"));

        PublicActorPagePageResult result = publicPages.findPage(RECENT, 0, 1);

        assertEquals(2, result.totalElements());
        assertEquals(2, result.totalPages());
        assertEquals("first", result.actorPages().getFirst().handle());
        assertEquals("새 이름", result.actorPages().getFirst().name());
        assertEquals(25, result.actorPages().getFirst().age());
        assertEquals("second", publicPages.findPage(RECENT, 1, 1).actorPages().getFirst().handle());
        assertTrue(result.actorPages().getFirst().representativePhotoUrl().startsWith("https://cdn.test/assets/"));
    }

    @Test
    void previewShowsWhatWouldBePublicWhilePrivate() {
        final long owner = actor();
        addPhoto(owner);
        final long publicPhoto = addPhoto(owner);
        photos.changeVisibility(owner, publicPhoto, PhotoVisibility.PUBLIC);
        final long copiedPhoto = publicPhotoWithCopy(owner);
        profiles.update(owner, new UpdateApplicantProfileCommand(null, new UpdateProfileAdditionalInformationCommand(
                null, null, null, List.of(), null, "무대에 서는 배우입니다.", "탭댄스", null, null, List.of()
        )));
        videos.addVideo(owner, new AddVideoToLibraryCommand(youtube("aaaaaaaaaaa")));
        pages.changeHandle(owner, "actor");
        pages.changeVisibilities(owner, Map.of(ActorPageField.COVER_LETTER, ActorPageVisibility.PUBLIC));

        PublicActorPageResult preview = publicPages.preview(owner);

        assertEquals("actor", preview.handle());
        assertEquals("배우", preview.name());
        assertEquals(List.of(imageUrl(owner, publicPhoto), copyUrl(owner, copiedPhoto)),
                preview.photos().stream().map(PublicActorPageResult.Photo::url).toList());
        assertEquals(imageUrl(owner, publicPhoto), preview.representativePhotoUrl());
        assertEquals("무대에 서는 배우입니다.", preview.coverLetter());
        assertNull(preview.specialty());
        assertTrue(preview.videos().isEmpty());
        assertThrows(BusinessException.class, () -> publicPages.findByHandle("actor"));
    }

    @Test
    void previewWithoutPageUsesPrivateDefaults() {
        long owner = actor();
        publicPhotoWithCopy(owner);

        PublicActorPageResult preview = publicPages.preview(owner);

        assertNull(preview.publicId());
        assertNull(preview.handle());
        assertEquals("배우", preview.name());
        assertEquals(1, preview.photos().size());
        assertTrue(preview.careerGroups().isEmpty());
        assertNull(preview.coverLetter());
    }

    @Test
    void rejectsUnknownSortAndPageOutOfRange() {
        assertThrows(IllegalArgumentException.class, () -> ActorPageSort.from("popular"));
        assertThrows(IllegalArgumentException.class, () -> publicPages.findPage(RECENT, -1, 12));
        assertThrows(IllegalArgumentException.class,
                () -> publicPages.findPage(RECENT, 0, PublicActorPageService.MAX_PAGE_SIZE + 1));
    }

    private long actor() {
        long owner = members.saveAndFlush(Member.ofApplicant()).getId();
        profiles.update(owner, basic("배우"));
        return owner;
    }

    private void publish(long owner, String handle) {
        pages.changeHandle(owner, handle);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
    }

    private long publicPhotoWithCopy(long owner) {
        long photoId = addPhoto(owner);
        photos.changeVisibility(owner, photoId, PhotoVisibility.PUBLIC);
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);
        copies.complete(owner, photoId, upload.uploadKey());
        return photoId;
    }

    private long addPhoto(long owner) {
        FileUploadResult upload = files.requestPrivateActorPhotoUpload(
                owner, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        storage.upload(upload.uploadUrl(), "image/png", 1_024L);
        files.completeUpload(owner, upload.fileId());
        return photos.addPhoto(owner, new AddPhotoToLibraryCommand(upload.fileId())).id();
    }

    private String copyUrl(long owner, long photoId) {
        return photos.findPhotos(owner).photos().stream()
                .filter(photo -> photo.id() == photoId)
                .findFirst()
                .map(PhotoLibraryItemResult::publicCopyUrl)
                .orElseThrow();
    }

    private String imageUrl(long owner, long photoId) {
        return photos.findPhotos(owner).photos().stream()
                .filter(photo -> photo.id() == photoId)
                .findFirst()
                .map(PhotoLibraryItemResult::imageUrl)
                .orElseThrow();
    }

    private static UpdateApplicantProfileCommand basic(String name) {
        return new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                name, 170, null, BIRTH, ProfileGender.FEMALE, "010-1234-5678", "actor@example.com", "서울"
        ), null);
    }

    private static String youtube(String id) {
        return "https://www.youtube.com/watch?v=" + id;
    }

    private void at(Instant instant) {
        when(clock.instant()).thenReturn(instant);
    }
}
