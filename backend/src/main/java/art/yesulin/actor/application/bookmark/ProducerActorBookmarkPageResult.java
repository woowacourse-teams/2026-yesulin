package art.yesulin.actor.application.bookmark;

import art.yesulin.actor.application.page.PublicActorPageSummaryResult;
import java.util.List;

/**
 * 공연사의 관심 배우 목록 한 페이지. 카드는 배우 목록과 같은 모양이다.
 *
 * @param totalElements 지금 목록에 보이는 저장 수
 * @param savedCount 숨겨진 저장도 포함한 전체 저장 수. 한도와 비교하는 값이다.
 * @param hiddenCount 배우가 비공개가 되거나 잠겨 목록에서 숨긴 저장 수
 * @param limit 공연사당 최대 저장 수
 */
public record ProducerActorBookmarkPageResult(
        List<PublicActorPageSummaryResult> actorPages,
        int page,
        int size,
        int totalPages,
        long totalElements,
        long savedCount,
        long hiddenCount,
        int limit
) {

    public ProducerActorBookmarkPageResult {
        actorPages = List.copyOf(actorPages);
    }
}
