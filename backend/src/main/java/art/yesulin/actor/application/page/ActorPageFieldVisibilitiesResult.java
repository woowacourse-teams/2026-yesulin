package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageField;
import art.yesulin.actor.domain.page.ActorPageVisibility;

public record ActorPageFieldVisibilitiesResult(
        ActorPageVisibility education,
        ActorPageVisibility careers,
        ActorPageVisibility coverLetter,
        ActorPageVisibility specialty,
        ActorPageVisibility hobbies,
        ActorPageVisibility nationality,
        ActorPageVisibility links
) {

    public static ActorPageFieldVisibilitiesResult from(ActorPage page) {
        return new ActorPageFieldVisibilitiesResult(
                page.visibilityOf(ActorPageField.EDUCATION), page.visibilityOf(ActorPageField.CAREERS),
                page.visibilityOf(ActorPageField.COVER_LETTER), page.visibilityOf(ActorPageField.SPECIALTY),
                page.visibilityOf(ActorPageField.HOBBIES), page.visibilityOf(ActorPageField.NATIONALITY),
                page.visibilityOf(ActorPageField.LINKS)
        );
    }
}
