package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPageHandleUnavailableReason;

public record ActorPageHandleAvailabilityResult(
        String handle,
        boolean available,
        ActorPageHandleUnavailableReason reason
) {
}
