package art.yesulin.actor.application.bookmark;

import java.util.List;
import java.util.UUID;

/** 저장 버튼 상태용으로 공연사가 저장한 배우 페이지 ID. 숨겨진 저장도 포함하며 최대 저장 수를 넘지 않는다. */
public record ProducerActorBookmarkIdsResult(List<UUID> publicIds) {

    public ProducerActorBookmarkIdsResult {
        publicIds = List.copyOf(publicIds);
    }
}
