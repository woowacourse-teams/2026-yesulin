package art.yesulin.actor.application.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.application.profile.ApplicantProfileService;
import art.yesulin.actor.application.profile.UpdateApplicantProfileCommand;
import art.yesulin.actor.application.profile.UpdateProfileAdditionalInformationCommand;
import art.yesulin.actor.application.profile.UpdateProfileBasicInformationCommand;
import art.yesulin.actor.application.videolibrary.AddVideoToLibraryCommand;
import art.yesulin.actor.application.videolibrary.VideoLibraryService;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageAutoHiddenReason;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPageField;
import art.yesulin.actor.domain.page.ActorPageHandle;
import art.yesulin.actor.domain.page.ActorPageHandleUnavailableReason;
import art.yesulin.actor.domain.page.ActorPagePublishConsentRepository;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.page.ActorPageStatus;
import art.yesulin.actor.domain.page.ActorPageVisibility;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
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
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:actor-page-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class ActorPageServiceTest {

    private long owner;
    private static final Instant NOW = Instant.parse("2026-10-27T00:00:00Z");
    private static final LocalDate BIRTH = LocalDate.of(2000, 1, 1);

    @Autowired
    private MemberRepository members;
    @Autowired
    private ActorPageService pages;
    @Autowired
    private ActorPageRepository pageRepository;
    @Autowired
    private ActorPagePublishConsentRepository consents;
    @Autowired
    private ApplicantProfileService profiles;
    @Autowired
    private PhotoLibraryService photos;
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
        when(clock.withZone(any())).thenAnswer(invocation -> Clock.fixed(clock.instant(), invocation.getArgument(0)));
        owner = members.saveAndFlush(Member.ofApplicant()).getId();
    }

    @Test
    void readsDefaultSettingsWithoutCreatingPage() {
        ActorPageSettingsResult result = pages.find(owner);
        assertNull(result.publicId());
        assertTrue(result.handleEditable());
        assertEquals(ActorPageStatus.PRIVATE, result.status());
        assertEquals(5, result.readiness().missing().size());
        assertFalse(result.publishPromptShown());
        assertEquals(ActorPage.CONSENT_VERSION, result.consentVersion());
        assertEquals(0, pageRepository.count());
    }

    @Test
    void writesSettingsAndRecordsPromptOnlyOnce() {
        assertNotNull(pages.changeHandle(owner, "  ACTOR  ").publicId());
        assertEquals("actor", pages.find(owner).handle());
        pages.recordPublishPrompt(owner);
        tick();
        pages.recordPublishPrompt(owner);
        assertEquals(NOW, page().getPublishPromptShownAt());
        assertTrue(pages.find(owner).publishPromptShown());
    }

    @Test
    void storesOneConsentPerActualPublicationAndKeepsFirstPublicationTime() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        final Instant first = page().getFirstPublishedAt();
        tick();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        assertEquals(1, consents.countByActorPageId(page().getId()));
        assertEquals(first, page().getPublishedAt());
        pages.unpublish(owner);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        assertEquals(2, consents.countByActorPageId(page().getId()));
        assertEquals(first, page().getFirstPublishedAt());
        assertEquals(NOW.plusSeconds(60), page().getPublishedAt());
        assertFalse(pages.find(owner).handleEditable());
        BusinessException exception = assertThrows(BusinessException.class, () -> pages.changeHandle(owner, "other"));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_LOCKED, exception.getErrorCode());
    }

    @Test
    void normalizesAvailabilityAndReportsFormatReservedTakenLockedAndOwnHandle() {
        assertTrue(pages.handleAvailability(owner, " ACTOR ").available());
        assertEquals("actor", pages.handleAvailability(owner, " ACTOR ").handle());
        assertEquals(ActorPageHandleUnavailableReason.INVALID_FORMAT, pages.handleAvailability(owner, ".bad").reason());
        assertEquals(ActorPageHandleUnavailableReason.RESERVED, pages.handleAvailability(owner, "admin").reason());
        pages.changeHandle(72L, "other");
        assertEquals(ActorPageHandleUnavailableReason.TAKEN, pages.handleAvailability(owner, "other").reason());
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        assertEquals(ActorPageHandleUnavailableReason.LOCKED, pages.handleAvailability(owner, "new").reason());
        assertTrue(pages.handleAvailability(owner, " ACTOR ").available());
    }

    @Test
    void rejectsAnotherMembersHandle() {
        pages.changeHandle(72L, "actor");
        BusinessException exception = assertThrows(BusinessException.class, () -> pages.changeHandle(owner, "Actor"));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_TAKEN, exception.getErrorCode());
    }

    @Test
    void clearingNameSucceedsAndAutomaticallyHidesPage() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        tick();
        profiles.update(owner, basic(null, BIRTH));
        assertHidden(ActorPageAutoHiddenReason.MISSING_REQUIRED);
        assertEquals(NOW, page().getLastPublicActivityAt());
    }

    @Test
    void birthDateChangeHidesUnderAgePageWithPriorityOverMissingName() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        profiles.update(owner, basic(null, LocalDate.of(2015, 1, 1)));
        assertHidden(ActorPageAutoHiddenReason.UNDER_14);
    }

    @Test
    void deletingLastPublicPhotoSucceedsAndHidesPage() {
        long photoId = ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        photos.deletePhoto(owner, photoId);
        assertHidden(ActorPageAutoHiddenReason.MISSING_REQUIRED);
    }

    @Test
    void makingLastPublicPhotoPrivateSucceedsAndHidesPage() {
        long photoId = ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        photos.changeVisibility(owner, photoId, PhotoVisibility.PRIVATE);
        assertHidden(ActorPageAutoHiddenReason.MISSING_REQUIRED);
        assertNull(pages.find(owner).pageRepresentativePhotoId());
    }

    @Test
    void onlyPublicProfileValuesAffectActivityAndSameValueIsNoOp() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        tick();
        profiles.update(owner, additional("첫 취미"));
        assertEquals(NOW, page().getLastPublicActivityAt());
        pages.changeVisibilities(owner, Map.of(ActorPageField.HOBBIES, ActorPageVisibility.PUBLIC));
        assertEquals(NOW.plusSeconds(60), page().getLastPublicActivityAt());
        when(clock.instant()).thenReturn(NOW.plusSeconds(120));
        profiles.update(owner, additional("새 취미"));
        assertEquals(NOW.plusSeconds(120), page().getLastPublicActivityAt());
        when(clock.instant()).thenReturn(NOW.plusSeconds(180));
        profiles.update(owner, additional("새 취미"));
        assertEquals(NOW.plusSeconds(120), page().getLastPublicActivityAt());
    }

    @Test
    void privateContactAndFullBirthDateChangesDoNotAffectPublicContent() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        tick();
        profiles.update(owner, new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                "배우", null, null, BIRTH.plusDays(1), ProfileGender.FEMALE, "010-1234-5678", "new@example.com", "서울"
        ), null));
        assertEquals(NOW, page().getLastPublicActivityAt());
    }

    @Test
    void publicPhotoOrderChangesActivityButMovingPrivatePhotoDoesNot() {
        final long first = ready();
        long second = addPhoto();
        final long third = addPhoto();
        photos.changeVisibility(owner, second, PhotoVisibility.PUBLIC);
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        tick();
        photos.makeRepresentative(owner, third);
        assertEquals(NOW, page().getLastPublicActivityAt());
        assertEquals(first, pages.find(owner).pageRepresentativePhotoId());
        photos.movePhoto(owner, second, 0);
        assertEquals(NOW.plusSeconds(60), page().getLastPublicActivityAt());
        assertEquals(second, pages.find(owner).pageRepresentativePhotoId());
    }

    @Test
    void producerVideosAreIgnoredAndPublicVisibilityOrderAndDeletionAffectActivity() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        tick();
        final long first = videos.addVideo(owner, new AddVideoToLibraryCommand("https://youtu.be/aqz-KE-bpKQ")).id();
        long second = videos.addVideo(owner, new AddVideoToLibraryCommand("https://youtu.be/dQw4w9WgXcQ")).id();
        assertEquals(NOW, page().getLastPublicActivityAt());
        videos.changeVisibility(owner, first, VideoVisibility.PUBLIC);
        videos.changeVisibility(owner, second, VideoVisibility.PUBLIC);
        assertEquals(NOW.plusSeconds(60), page().getLastPublicActivityAt());
        when(clock.instant()).thenReturn(NOW.plusSeconds(120));
        videos.moveVideo(owner, second, 0);
        assertEquals(NOW.plusSeconds(120), page().getLastPublicActivityAt());
        when(clock.instant()).thenReturn(NOW.plusSeconds(180));
        videos.deleteVideo(owner, first);
        assertEquals(NOW.plusSeconds(180), page().getLastPublicActivityAt());
    }

    @Test
    void privatePageContentChangesNeverChangeActivityOrAutoHiddenReason() {
        ready();
        profiles.update(owner, basic(null, BIRTH));
        assertNull(page().getLastPublicActivityAt());
        assertNull(page().getAutoHiddenReason());
        assertEquals(ActorPageStatus.PRIVATE, page().getStatus());
    }

    @Test
    void restoresConditionsAndRepublishesWithFreshConsent() {
        ready();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        profiles.update(owner, basic(null, BIRTH));
        profiles.update(owner, basic("복원한 배우", BIRTH));
        assertHidden(ActorPageAutoHiddenReason.MISSING_REQUIRED);
        tick();
        pages.publish(owner, true, ActorPage.CONSENT_VERSION);
        assertEquals(ActorPageStatus.PUBLIC, page().getStatus());
        assertNull(page().getAutoHiddenReason());
        assertEquals(2, consents.countByActorPageId(page().getId()));
    }

    @Test
    void translatesRealHandleConstraintViolationToHandleTaken() {
        long other = members.saveAndFlush(Member.ofApplicant()).getId();
        pageRepository.saveAndFlush(pageWithHandle(owner, "same.handle"));

        DataIntegrityViolationException exception = assertThrows(DataIntegrityViolationException.class,
                () -> pageRepository.saveAndFlush(pageWithHandle(other, "same.handle")));

        BusinessException translated = assertInstanceOf(BusinessException.class, ActorPageService.translate(exception));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_TAKEN, translated.getErrorCode());
    }

    @Test
    void translatesRealOwnerConstraintViolationToRetryableConflict() {
        pageRepository.saveAndFlush(new ActorPage(owner));

        DataIntegrityViolationException exception = assertThrows(DataIntegrityViolationException.class,
                () -> pageRepository.saveAndFlush(new ActorPage(owner)));

        BusinessException translated = assertInstanceOf(BusinessException.class, ActorPageService.translate(exception));
        assertEquals(ActorPageErrorCode.ACTOR_PAGE_CONFLICT, translated.getErrorCode());
    }

    private long ready() {
        profiles.update(owner, basic("배우", BIRTH));
        pages.changeHandle(owner, "actor");
        long id = addPhoto();
        photos.changeVisibility(owner, id, PhotoVisibility.PUBLIC);
        return id;
    }

    private long addPhoto() {
        FileUploadResult upload = files.requestPrivateActorPhotoUpload(
                owner, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        storage.upload(upload.uploadUrl(), "image/png", 1_024L);
        files.completeUpload(owner, upload.fileId());
        PhotoLibraryItemResult result = photos.addPhoto(owner, new AddPhotoToLibraryCommand(upload.fileId()));
        assertEquals(PhotoVisibility.PRIVATE, result.visibility());
        return result.id();
    }

    private static ActorPage pageWithHandle(long memberId, String handle) {
        ActorPage page = new ActorPage(memberId);
        page.changeHandle(new ActorPageHandle(handle));
        return page;
    }

    private UpdateApplicantProfileCommand basic(String name, LocalDate birth) {
        return new UpdateApplicantProfileCommand(new UpdateProfileBasicInformationCommand(
                name, null, null, birth, ProfileGender.FEMALE, null, null, null
        ), null);
    }

    private UpdateApplicantProfileCommand additional(String hobbies) {
        return new UpdateApplicantProfileCommand(null, new UpdateProfileAdditionalInformationCommand(
                null, null, null, List.of(), null, null, null, hobbies, null, List.of()
        ));
    }

    private ActorPage page() {
        return pageRepository.findByOwnerMemberId(owner).orElseThrow();
    }

    private void assertHidden(ActorPageAutoHiddenReason reason) {
        assertEquals(ActorPageStatus.PRIVATE, page().getStatus());
        assertEquals(reason, page().getAutoHiddenReason());
    }

    private void tick() {
        when(clock.instant()).thenReturn(NOW.plusSeconds(60));
    }
}
