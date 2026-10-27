package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPagePublicContent;
import art.yesulin.actor.domain.page.ActorPageReadiness;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ApplicantProfileRepository;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import art.yesulin.actor.domain.videolibrary.VideoLibraryRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class ActorPageContentSync {

    private static final ZoneId DATE_ZONE = ZoneId.of("Asia/Seoul");

    private final ApplicantProfileRepository profileRepository;
    private final PhotoLibraryRepository photoRepository;
    private final VideoLibraryRepository videoRepository;
    private final ActorPageRepository pageRepository;
    private final Clock clock;

    // 변경 메서드 맨 처음, 기존 보관함 잠금보다 먼저 호출한다. 잠금 순서: 프로필 → 사진 → 영상 → 배우 페이지.
    public ActorPageContentState lock(long ownerId) {
        ApplicantProfile profile = profileRepository.findByOwnerIdForUpdate(ownerId).orElse(null);
        PhotoLibrary photos = photoRepository.findByOwnerIdForUpdate(ownerId).orElse(null);
        VideoLibrary videos = videoRepository.findByOwnerIdForUpdate(ownerId).orElse(null);
        ActorPage page = pageRepository.findByOwnerMemberIdForUpdate(ownerId).orElse(null);
        ActorPagePublicContent before = page != null && page.isPublic()
                ? ActorPagePublicContent.from(page, profile, photos, videos) : null;
        return new ActorPageContentState(profile, photos, videos, page, before);
    }

    public ActorPageContentState read(long ownerId) {
        return new ActorPageContentState(
                profileRepository.findByOwnerId(ownerId).orElse(null),
                photoRepository.findByOwnerId(ownerId).orElse(null),
                videoRepository.findByOwnerId(ownerId).orElse(null),
                pageRepository.findByOwnerMemberId(ownerId).orElse(null), null
        );
    }

    public void synchronize(ActorPageContentState state) {
        if (state.page() == null || !state.page().isPublic()) {
            return;
        }
        ActorPageReadiness readiness = state.readiness(state.page(), today());
        boolean changed = !readiness.underAge() && readiness.missing().isEmpty()
                && !state.before().equals(state.publicContent());
        state.page().synchronizeContent(readiness, changed, Instant.now(clock));
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(DATE_ZONE));
    }
}
