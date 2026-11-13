package art.yesulin.actor.application.cheer;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.global.exception.BusinessException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 배우 목록에 보이는 페이지(공개 중이고 잠기지 않음)만 찾는다. 그 밖은 존재 여부를 알 수 없도록 공개 조회와 같은 404다.
 */
@Component
@RequiredArgsConstructor
public class ListedActorPageFinder {

    private final ActorPageRepository pageRepository;

    public ActorPage find(UUID publicId) {
        return pageRepository.findByPublicId(publicId)
                .filter(page -> page.isPublic() && !page.isLocked())
                .orElseThrow(() -> new BusinessException(ACTOR_PAGE_NOT_FOUND, "배우 페이지를 찾을 수 없습니다."));
    }
}
