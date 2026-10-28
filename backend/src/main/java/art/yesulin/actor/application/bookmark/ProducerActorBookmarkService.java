package art.yesulin.actor.application.bookmark;

import static art.yesulin.actor.domain.bookmark.ProducerActorBookmark.MAX_PER_PRODUCER;
import static art.yesulin.actor.domain.bookmark.ProducerActorBookmarkErrorCode.ACTOR_BOOKMARK_LIMIT_EXCEEDED;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND;

import art.yesulin.actor.application.page.ActorPageSummaries;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmark;
import art.yesulin.actor.domain.bookmark.ProducerActorBookmarkRepository;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.page.ActorPageStatus;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공연사의 관심 배우 저장. 배우에게는 누가 몇 명 저장했는지 알리지 않는다. 저장한 배우가 비공개·잠금·자동 비공개가 되면
 * 목록에서만 숨기고 저장은 유지하며, 숨긴 저장도 한도에 포함한다.
 */
@Service
@RequiredArgsConstructor
public class ProducerActorBookmarkService {

    static final int MAX_PAGE_SIZE = 48;

    private final ProducerActorBookmarkRepository bookmarkRepository;
    private final ActorPageRepository pageRepository;
    private final ActorPageSummaries summaries;
    private final Clock clock;

    /**
     * 같은 요청을 반복해도 결과가 같다. 이미 저장했으면 배우가 지금 비공개여도 그대로 성공한다. 새로 저장할 때는 배우 목록에
     * 보이는 페이지만 받고, 그 밖은 공개 조회처럼 존재 여부를 알 수 없는 404다.
     *
     * <p>쓰기는 한 행 추가뿐이라 서비스 트랜잭션으로 묶지 않는다. 같은 저장이 동시에 들어와 유일 제약에 걸리면 그 추가만
     * 롤백되므로, 이미 저장된 것을 확인하고 같은 결과로 답한다. 한도 검사는 같은 공연사의 동시 저장까지 막지는 않는다.
     */
    public void save(long producerId, UUID publicId) {
        ActorPage page = pageRepository.findByPublicId(publicId).orElseThrow(ProducerActorBookmarkService::notFound);
        if (bookmarkRepository.existsByProducerMemberIdAndActorPageId(producerId, page.getId())) {
            return;
        }
        if (!page.isPublic() || page.isLocked()) {
            throw notFound();
        }
        long saved = bookmarkRepository.countByProducerMemberId(producerId);
        if (saved >= MAX_PER_PRODUCER) {
            throw limitExceeded(producerId, saved);
        }
        try {
            bookmarkRepository.saveAndFlush(new ProducerActorBookmark(producerId, page.getId(), Instant.now(clock)));
        } catch (DataIntegrityViolationException exception) {
            if (!bookmarkRepository.existsByProducerMemberIdAndActorPageId(producerId, page.getId())) {
                throw exception;
            }
        }
    }

    /** 저장하지 않았거나 없는 페이지여도 같은 결과로 답한다. */
    @Transactional
    public void remove(long producerId, UUID publicId) {
        pageRepository.findByPublicId(publicId)
                .ifPresent(page -> bookmarkRepository.deleteSaved(producerId, page.getId()));
    }

    @Transactional(readOnly = true)
    public ProducerActorBookmarkIdsResult findSavedIds(long producerId) {
        return new ProducerActorBookmarkIdsResult(bookmarkRepository.findSavedPublicIds(producerId));
    }

    @Transactional(readOnly = true)
    public ProducerActorBookmarkPageResult findPage(long producerId, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("page는 0 이상, size는 1~%d여야 합니다.".formatted(MAX_PAGE_SIZE));
        }
        Page<ActorPage> listed = bookmarkRepository.findListedPages(
                producerId, ActorPageStatus.PUBLIC, PageRequest.of(page, size)
        );
        long saved = bookmarkRepository.countByProducerMemberId(producerId);
        return new ProducerActorBookmarkPageResult(
                summaries.of(listed.getContent()), page, size, listed.getTotalPages(), listed.getTotalElements(),
                saved, saved - listed.getTotalElements(), MAX_PER_PRODUCER
        );
    }

    private BusinessException limitExceeded(long producerId, long saved) {
        long listed = bookmarkRepository.findListedPages(producerId, ActorPageStatus.PUBLIC, PageRequest.of(0, 1))
                .getTotalElements();
        long hidden = saved - listed;
        String hiddenNotice = hidden > 0 ? " 비공개로 바뀌어 목록에 보이지 않는 배우 %d명도 포함됩니다.".formatted(hidden) : "";
        return new BusinessException(ACTOR_BOOKMARK_LIMIT_EXCEEDED,
                "관심 배우는 %d명까지 저장할 수 있습니다.%s".formatted(MAX_PER_PRODUCER, hiddenNotice));
    }

    private static BusinessException notFound() {
        return new BusinessException(ACTOR_PAGE_NOT_FOUND, "배우 페이지를 찾을 수 없습니다.");
    }
}
