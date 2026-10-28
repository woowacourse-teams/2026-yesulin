package art.yesulin.actor.application.page;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND;

import art.yesulin.actor.application.page.PublicActorPageResult.Video;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageHandle;
import art.yesulin.actor.domain.page.ActorPagePublicContent;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.page.ActorPageStatus;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryItem;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ApplicantProfileRepository;
import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import art.yesulin.actor.domain.videolibrary.VideoLibrary;
import art.yesulin.actor.domain.videolibrary.VideoLibraryItem;
import art.yesulin.file.application.FileService;
import art.yesulin.global.exception.BusinessException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 누구나 보는 배우 목록과 배우 페이지. 세션을 읽지 않으며, 보는 사람과 무관하게 같은 응답을 준다. 비공개·운영자 잠금·
 * 자동 비공개·공개 조건 미충족·없는 아이디는 존재 여부를 알 수 없게 모두 같은 404로 답한다. 배우 본인의 미리보기도 같은
 * 응답 모양과 항목 공개 규칙을 쓴다.
 */
@Service
@RequiredArgsConstructor
public class PublicActorPageService {

    static final int MAX_PAGE_SIZE = 48;

    private final ActorPageRepository pageRepository;
    private final ApplicantProfileRepository profileRepository;
    private final PhotoLibraryRepository photoRepository;
    private final ActorPageContentSync contentSync;
    private final PublicPhotoCopyStorage publicCopies;
    private final FileService fileService;

    /** 대문자가 섞인 아이디는 소문자로 찾고, 응답의 아이디로 정규 주소를 알려 준다. */
    @Transactional(readOnly = true)
    public PublicActorPageResult findByHandle(String handle) {
        String normalized = ActorPageHandle.normalize(handle);
        if (!ActorPageHandle.hasValidFormat(normalized)) {
            throw notFound();
        }
        ActorPage page = pageRepository.findByHandle(normalized)
                .filter(ActorPage::isPublic)
                .orElseThrow(PublicActorPageService::notFound);
        ActorPageContentState state = contentSync.read(page.getOwnerMemberId());
        LocalDate today = contentSync.today();
        if (!state.readiness(page, today).ready()) {
            throw notFound();
        }
        ActorPagePublicContent content = state.publicContent();
        return PublicActorPageResult.of(
                page, content, age(state.profile(), today), photoUrls(state.photos(), content),
                videos(state.videos(), content)
        );
    }

    /**
     * 공개 상태·공개 조건과 무관하게, 지금 공개하면 누구나 볼 내용을 보여 준다. 공개 사본은 공개할 때 만들므로 사본이 아직 없는
     * 공개 사진은 본인만 받을 수 있는 원본 주소로 대신 보여 준다. 페이지를 만든 적이 없으면 모든 항목이 비공개인 기본값이다.
     */
    @Transactional(readOnly = true)
    public PublicActorPageResult preview(long ownerId) {
        ActorPageContentState state = contentSync.read(ownerId);
        ActorPage page = state.page() == null ? new ActorPage(ownerId) : state.page();
        ActorPagePublicContent content = ActorPagePublicContent.from(
                page, state.profile(), state.photos(), state.videos()
        );
        return PublicActorPageResult.of(
                page, content, age(state.profile(), contentSync.today()), previewPhotoUrls(state.photos()),
                videos(state.videos(), content)
        );
    }

    @Transactional(readOnly = true)
    public PublicActorPagePageResult findPage(ActorPageSearchCondition condition, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("page는 0 이상, size는 1~%d여야 합니다.".formatted(MAX_PAGE_SIZE));
        }
        Page<ActorPage> found = pageRepository.findAllByStatusAndLockedAtIsNull(
                ActorPageStatus.PUBLIC, PageRequest.of(page, size, condition.sort().sort())
        );
        List<Long> ownerIds = found.getContent().stream().map(ActorPage::getOwnerMemberId).toList();
        Map<Long, ApplicantProfile> profiles = ownerIds.isEmpty() ? Map.of()
                : profileRepository.findAllByOwnerIdIn(ownerIds).stream()
                        .collect(Collectors.toMap(ApplicantProfile::getOwnerId, Function.identity()));
        Map<Long, PhotoLibrary> photos = ownerIds.isEmpty() ? Map.of()
                : photoRepository.findAllWithPhotosByOwnerIdIn(ownerIds).stream()
                        .collect(Collectors.toMap(PhotoLibrary::getOwnerId, Function.identity()));
        LocalDate today = contentSync.today();
        List<PublicActorPageSummaryResult> summaries = found.getContent().stream()
                .map(actorPage -> summary(
                        actorPage, profiles.get(actorPage.getOwnerMemberId()),
                        photos.get(actorPage.getOwnerMemberId()), today
                ))
                .toList();
        return new PublicActorPagePageResult(summaries, page, size, found.getTotalPages(), found.getTotalElements());
    }

    private PublicActorPageSummaryResult summary(
            ActorPage page, ApplicantProfile profile, PhotoLibrary photos, LocalDate today
    ) {
        ProfileBasicInformation basic = basicOf(profile);
        String photoUrl = photos == null ? null : photos.getPageRepresentativePhoto()
                .map(photo -> publicCopies.publicUrl(photo.getPublicCopyObjectKey()))
                .orElse(null);
        return new PublicActorPageSummaryResult(
                page.getPublicId(), page.getHandle(), basic.name(), basic.gender(),
                basic.birthDate() == null ? null : basic.birthDate().getYear(), age(profile, today),
                basic.height(), basic.weight(), photoUrl
        );
    }

    private List<String> photoUrls(PhotoLibrary photos, ActorPagePublicContent content) {
        if (photos == null) {
            return List.of();
        }
        Map<Long, PhotoLibraryItem> byId = photos.getPhotos().stream()
                .collect(Collectors.toMap(PhotoLibraryItem::getId, Function.identity()));
        return content.photoIds().stream()
                .map(photoId -> publicCopies.publicUrl(byId.get(photoId).getPublicCopyObjectKey()))
                .toList();
    }

    private List<String> previewPhotoUrls(PhotoLibrary photos) {
        if (photos == null) {
            return List.of();
        }
        return photos.getPhotos().stream()
                .filter(PhotoLibraryItem::isPublic)
                .map(photo -> photo.hasPublicCopy()
                        ? publicCopies.publicUrl(photo.getPublicCopyObjectKey())
                        : fileService.privateContentUrl(photo.getFileId()))
                .toList();
    }

    private static List<Video> videos(VideoLibrary videos, ActorPagePublicContent content) {
        if (videos == null) {
            return List.of();
        }
        Map<Long, VideoLibraryItem> byId = videos.getVideos().stream()
                .collect(Collectors.toMap(VideoLibraryItem::getId, Function.identity()));
        return content.videoIds().stream()
                .map(byId::get)
                .map(video -> new Video(video.getUrl(), video.getYoutubeId()))
                .toList();
    }

    private static Integer age(ApplicantProfile profile, LocalDate today) {
        return PublicActorPageResult.ageOn(basicOf(profile).birthDate(), today);
    }

    private static ProfileBasicInformation basicOf(ApplicantProfile profile) {
        ProfileBasicInformation basic = profile == null ? null : profile.getBasicInformation();
        return basic == null ? ProfileBasicInformation.empty() : basic;
    }

    private static BusinessException notFound() {
        return new BusinessException(ACTOR_PAGE_NOT_FOUND, "배우 페이지를 찾을 수 없습니다.");
    }
}
