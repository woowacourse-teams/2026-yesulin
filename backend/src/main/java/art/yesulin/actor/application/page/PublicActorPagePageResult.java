package art.yesulin.actor.application.page;

import java.util.List;

public record PublicActorPagePageResult(
        List<PublicActorPageSummaryResult> actorPages,
        int page,
        int size,
        int totalPages,
        long totalElements
) {

    public PublicActorPagePageResult {
        actorPages = List.copyOf(actorPages);
    }
}
