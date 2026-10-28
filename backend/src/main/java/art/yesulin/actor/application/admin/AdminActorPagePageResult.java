package art.yesulin.actor.application.admin;

import java.util.List;

public record AdminActorPagePageResult(
        List<AdminActorPageSummaryResult> actorPages,
        int page,
        int size,
        int totalPages,
        long totalElements
) {

    public AdminActorPagePageResult {
        actorPages = List.copyOf(actorPages);
    }
}
