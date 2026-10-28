package art.yesulin.actor.application.bookmark;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.page.PublicActorPageSummaryResult;
import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyService;
import art.yesulin.actor.application.photolibrary.PhotoPublicCopyUploadResult;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmark;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmarkErrorCode;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmarkRepository;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profile.ProfileGender;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:producer-actor-bookmark-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class ProducerActorBookmarkServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-28T00:00:00Z");
    private static final long PRODUCER = 1L;
    private static final long OTHER_PRODUCER = 2L;
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10};

    @Autowired
    private ProducerActorBookmarkService bookmarks;
    @Autowired
    private ProducerActorBookmarkRepository bookmarkRepository;
    @Autowired
    private ActorPageRepository pageRepository;
    @Autowired
    private MemberRepository members;
    @Autowired
    private ActorPageService pages;
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
        at(NOW);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.withZone(any())).thenAnswer(invocation -> Clock.fixed(clock.instant(), invocation.getArgument(0)));
    }

    @Test
    void savingTwiceKeepsOneAndListsMostRecentFirst() {
        final UUID first = publicActor("first").publicId();
        final UUID second = publicActor("second").publicId();

        bookmarks.save(PRODUCER, first);
        at(NOW.plusSeconds(60));
        bookmarks.save(PRODUCER, second);
        bookmarks.save(PRODUCER, first);

        ProducerActorBookmarkPageResult result = bookmarks.findPage(PRODUCER, 0, 12);
        assertEquals(List.of("second", "first"), handles(result));
        assertEquals(2, result.savedCount());
        assertEquals(0, result.hiddenCount());
        assertEquals(List.of(second, first), bookmarks.findSavedIds(PRODUCER).publicIds());
        assertTrue(bookmarks.findSavedIds(OTHER_PRODUCER).publicIds().isEmpty());
    }

    @Test
    void privateActorIsHiddenButStaysSavedUntilPublicAgain() {
        PublicActor actor = publicActor("actor");
        bookmarks.save(PRODUCER, actor.publicId());

        pages.unpublish(actor.owner());

        ProducerActorBookmarkPageResult hidden = bookmarks.findPage(PRODUCER, 0, 12);
        assertEquals(0, hidden.totalElements());
        assertEquals(1, hidden.savedCount());
        assertEquals(1, hidden.hiddenCount());
        assertEquals(List.of(actor.publicId()), bookmarks.findSavedIds(PRODUCER).publicIds());
        assertDoesNotThrow(() -> bookmarks.save(PRODUCER, actor.publicId()));

        copy(actor.owner(), actor.photoId());
        pages.publish(actor.owner(), true, ActorPage.CONSENT_VERSION);

        assertEquals(List.of("actor"), handles(bookmarks.findPage(PRODUCER, 0, 12)));
    }

    @Test
    void onlyActorsOnTheListCanBeSavedNewly() {
        long owner = actor();
        pages.changeHandle(owner, "private.actor");
        UUID privatePage = pageRepository.findByOwnerMemberId(owner).orElseThrow().getPublicId();

        for (UUID publicId : List.of(privatePage, UUID.randomUUID())) {
            BusinessException exception = assertThrows(
                    BusinessException.class, () -> bookmarks.save(PRODUCER, publicId)
            );
            assertEquals(ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND, exception.getErrorCode());
        }
    }

    @Test
    void limitCountsSavesHiddenFromTheList() {
        List<ActorPage> privatePages = pageRepository.saveAll(LongStream.rangeClosed(1, 300)
                .mapToObj(owner -> new ActorPage(10_000 + owner))
                .toList());
        bookmarkRepository.saveAll(privatePages.stream()
                .map(page -> new ProducerActorBookmark(PRODUCER, page.getId(), NOW))
                .toList());
        UUID actor = publicActor("actor").publicId();

        BusinessException exception = assertThrows(BusinessException.class, () -> bookmarks.save(PRODUCER, actor));

        assertEquals(ProducerActorBookmarkErrorCode.ACTOR_BOOKMARK_LIMIT_EXCEEDED, exception.getErrorCode());
        assertTrue(exception.getMessage().contains("배우 300명도 포함"));
        assertEquals(300, bookmarks.findPage(PRODUCER, 0, 12).hiddenCount());
        assertDoesNotThrow(() -> bookmarks.save(OTHER_PRODUCER, actor));
    }

    @Test
    void removingIsIdempotent() {
        UUID actor = publicActor("actor").publicId();
        bookmarks.save(PRODUCER, actor);

        bookmarks.remove(PRODUCER, actor);
        bookmarks.remove(PRODUCER, actor);
        bookmarks.remove(PRODUCER, UUID.randomUUID());

        assertTrue(bookmarks.findSavedIds(PRODUCER).publicIds().isEmpty());
        assertEquals(0, bookmarks.findPage(PRODUCER, 0, 12).savedCount());
    }

    @Test
    void rejectsPageOutOfRange() {
        assertThrows(IllegalArgumentException.class, () -> bookmarks.findPage(PRODUCER, -1, 12));
        assertThrows(IllegalArgumentException.class,
                () -> bookmarks.findPage(PRODUCER, 0, ProducerActorBookmarkService.MAX_PAGE_SIZE + 1));
    }

    private PublicActor publicActor(String handle) {
        long owner = actor();
        long photoId = addPhoto(owner);
        photos.changeVisibility(owner, photoId, PhotoVisibility.PUBLIC);
        copy(owner, photoId);
        pages.changeHandle(owner, handle);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        return new PublicActor(owner, photoId, pageRepository.findByOwnerMemberId(owner).orElseThrow().getPublicId());
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

    private void copy(long owner, long photoId) {
        PhotoPublicCopyUploadResult upload = copies.prepareUpload(owner, photoId, "image/jpeg", JPEG.length);
        storage.upload(upload.url(), "image/jpeg", JPEG);
        copies.complete(owner, photoId, upload.uploadKey());
    }

    private static List<String> handles(ProducerActorBookmarkPageResult result) {
        return result.actorPages().stream().map(PublicActorPageSummaryResult::handle).toList();
    }

    private void at(Instant instant) {
        when(clock.instant()).thenReturn(instant);
    }

    private record PublicActor(long owner, long photoId, UUID publicId) {
    }
}
