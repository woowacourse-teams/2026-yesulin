package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryRepository;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ApplicantProfileRepository;
import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 배우 목록 카드. 배우 목록과 공연사 관심 배우 목록이 같은 카드를 쓴다. 프로필과 사진 보관함은 페이지마다 읽지 않고 한 번에
 * 읽는다. 호출하는 쪽의 트랜잭션 안에서 쓴다.
 */
@Component
@RequiredArgsConstructor
public class ActorPageSummaries {

    private final ApplicantProfileRepository profileRepository;
    private final PhotoLibraryRepository photoRepository;
    private final ActorPageContentSync contentSync;
    private final PublicPhotoCopyStorage publicCopies;

    public List<PublicActorPageSummaryResult> of(List<ActorPage> pages) {
        if (pages.isEmpty()) {
            return List.of();
        }
        List<Long> ownerIds = pages.stream().map(ActorPage::getOwnerMemberId).toList();
        Map<Long, ApplicantProfile> profiles = profileRepository.findAllByOwnerIdIn(ownerIds).stream()
                .collect(Collectors.toMap(ApplicantProfile::getOwnerId, Function.identity()));
        Map<Long, PhotoLibrary> photos = photoRepository.findAllWithPhotosByOwnerIdIn(ownerIds).stream()
                .collect(Collectors.toMap(PhotoLibrary::getOwnerId, Function.identity()));
        LocalDate today = contentSync.today();
        return pages.stream()
                .map(page -> summary(
                        page, profiles.get(page.getOwnerMemberId()), photos.get(page.getOwnerMemberId()), today
                ))
                .toList();
    }

    private PublicActorPageSummaryResult summary(
            ActorPage page, ApplicantProfile profile, PhotoLibrary photos, LocalDate today
    ) {
        ProfileBasicInformation basic = profile == null || profile.getBasicInformation() == null
                ? ProfileBasicInformation.empty() : profile.getBasicInformation();
        String photoUrl = photos == null ? null : photos.getPageRepresentativePhoto()
                .map(photo -> publicCopies.publicUrl(photo.getPublicCopyObjectKey()))
                .orElse(null);
        return new PublicActorPageSummaryResult(
                page.getPublicId(), page.getHandle(), basic.name(), basic.gender(),
                basic.birthDate() == null ? null : basic.birthDate().getYear(),
                PublicActorPageResult.ageOn(basic.birthDate(), today), basic.height(), basic.weight(), photoUrl
        );
    }
}
