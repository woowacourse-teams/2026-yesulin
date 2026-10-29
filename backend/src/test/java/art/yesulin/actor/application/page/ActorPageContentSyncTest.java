package art.yesulin.actor.application.page;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageErrorCode;
import art.yesulin.actor.domain.page.ActorPagePublishConsentRepository;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ApplicantProfileRepository;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import art.yesulin.actor.domain.videolibrary.VideoLibraryRepository;
import art.yesulin.global.exception.BusinessException;
import java.sql.SQLException;
import java.time.Clock;
import java.util.Optional;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.dao.DataIntegrityViolationException;

class ActorPageContentSyncTest {

    @Test
    void locksInRequiredOrderAndSkipsSnapshotForPrivatePages() {
        ApplicantProfileRepository profiles = mock(ApplicantProfileRepository.class);
        PhotoLibraryRepository photos = mock(PhotoLibraryRepository.class);
        VideoLibraryRepository videos = mock(VideoLibraryRepository.class);
        ActorPageRepository pages = mock(ActorPageRepository.class);
        ApplicantProfile profile = mock(ApplicantProfile.class);
        PhotoLibrary photoLibrary = mock(PhotoLibrary.class);
        VideoLibrary videoLibrary = mock(VideoLibrary.class);
        when(profiles.findByOwnerIdForUpdate(1L)).thenReturn(Optional.of(profile));
        when(photos.findByOwnerIdForUpdate(1L)).thenReturn(Optional.of(photoLibrary));
        when(videos.findByOwnerIdForUpdate(1L)).thenReturn(Optional.of(videoLibrary));
        when(pages.findByOwnerMemberIdForUpdate(1L)).thenReturn(Optional.of(new ActorPage(1L)));
        ActorPageContentSync sync = new ActorPageContentSync(
                profiles, photos, videos, pages, mock(PublicPhotoCopyStorage.class), Clock.systemUTC()
        );
        ActorPageContentState state = sync.lock(1L);
        sync.synchronize(state);
        InOrder order = inOrder(profiles, photos, videos, pages);
        order.verify(profiles).findByOwnerIdForUpdate(1L);
        order.verify(photos).findByOwnerIdForUpdate(1L);
        order.verify(videos).findByOwnerIdForUpdate(1L);
        order.verify(pages).findByOwnerMemberIdForUpdate(1L);
        assertNull(state.before());
        verify(profile, never()).getBasicInformation();
        verify(profile, never()).getAdditionalInformation();
        verify(photoLibrary, never()).getPhotos();
        verify(videoLibrary, never()).getVideos();
    }

    @Test
    void absentPageSkipsBothSnapshotsAndSynchronization() {
        ApplicantProfileRepository profiles = mock(ApplicantProfileRepository.class);
        PhotoLibraryRepository photos = mock(PhotoLibraryRepository.class);
        VideoLibraryRepository videos = mock(VideoLibraryRepository.class);
        ActorPageRepository pages = mock(ActorPageRepository.class);
        ActorPageContentSync sync = new ActorPageContentSync(
                profiles, photos, videos, pages, mock(PublicPhotoCopyStorage.class), Clock.systemUTC()
        );
        ActorPageContentState state = sync.lock(1L);
        sync.synchronize(state);
        assertNull(state.before());
        assertNull(state.page());
    }

    @Test
    void mapsDatabaseUniquenessViolationToHandleTaken() {
        ActorPageRepository repository = mock(ActorPageRepository.class);
        ActorPageContentSync sync = mock(ActorPageContentSync.class);
        when(sync.lock(1L)).thenReturn(new ActorPageContentState(null, null, null, null, null, null));
        when(repository.saveAndFlush(any())).thenThrow(violation("PUBLIC.UK_ACTOR_PAGES_HANDLE_INDEX_7"));
        ActorPageService service = new ActorPageService(
                repository, mock(ActorPagePublishConsentRepository.class), sync, Clock.systemUTC()
        );
        BusinessException exception = assertThrows(BusinessException.class, () -> service.changeHandle(1L, "actor"));
        assertEquals(ActorPageErrorCode.ACTOR_HANDLE_TAKEN, exception.getErrorCode());
    }

    @Test
    void mapsConcurrentFirstPageCreationToRetryableConflictInsteadOfHandleTaken() {
        ActorPageRepository repository = mock(ActorPageRepository.class);
        ActorPageContentSync sync = mock(ActorPageContentSync.class);
        when(sync.lock(1L)).thenReturn(new ActorPageContentState(null, null, null, null, null, null));
        when(repository.saveAndFlush(any()))
                .thenThrow(violation("actor_pages.uk_actor_pages_owner_member_id"));
        ActorPageService service = new ActorPageService(
                repository, mock(ActorPagePublishConsentRepository.class), sync, Clock.systemUTC()
        );

        BusinessException handle = assertThrows(BusinessException.class, () -> service.changeHandle(1L, "actor"));
        BusinessException prompt = assertThrows(BusinessException.class, () -> service.recordPublishPrompt(1L));

        assertEquals(ActorPageErrorCode.ACTOR_PAGE_CONFLICT, handle.getErrorCode());
        assertEquals(ActorPageErrorCode.ACTOR_PAGE_CONFLICT, prompt.getErrorCode());
    }

    @Test
    void rethrowsIntegrityViolationsOfOtherConstraints() {
        DataIntegrityViolationException unknown = violation("pk_actor_pages");
        DataIntegrityViolationException withoutConstraint = new DataIntegrityViolationException("unknown");

        assertSame(unknown, ActorPageService.translate(unknown));
        assertSame(withoutConstraint, ActorPageService.translate(withoutConstraint));
    }

    private static DataIntegrityViolationException violation(String constraintName) {
        SQLException cause = new SQLException("duplicate key");
        return new DataIntegrityViolationException(
                "duplicate key", new ConstraintViolationException("duplicate key", cause, constraintName)
        );
    }
}
