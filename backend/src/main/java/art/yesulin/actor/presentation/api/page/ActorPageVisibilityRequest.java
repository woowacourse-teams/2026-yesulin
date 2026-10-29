package art.yesulin.actor.presentation.api.page;

import art.yesulin.actor.domain.page.ActorPageField;
import art.yesulin.actor.domain.page.ActorPageVisibility;
import java.util.EnumMap;
import java.util.Map;

public record ActorPageVisibilityRequest(
        ActorPageVisibility education,
        ActorPageVisibility careers,
        ActorPageVisibility coverLetter,
        ActorPageVisibility specialty,
        ActorPageVisibility hobbies,
        ActorPageVisibility nationality,
        ActorPageVisibility links
) {

    public Map<ActorPageField, ActorPageVisibility> changes() {
        Map<ActorPageField, ActorPageVisibility> changes = new EnumMap<>(ActorPageField.class);
        add(changes, ActorPageField.EDUCATION, education);
        add(changes, ActorPageField.CAREERS, careers);
        add(changes, ActorPageField.COVER_LETTER, coverLetter);
        add(changes, ActorPageField.SPECIALTY, specialty);
        add(changes, ActorPageField.HOBBIES, hobbies);
        add(changes, ActorPageField.NATIONALITY, nationality);
        add(changes, ActorPageField.LINKS, links);
        return changes;
    }

    private void add(
            Map<ActorPageField, ActorPageVisibility> changes, ActorPageField field, ActorPageVisibility value
    ) {
        if (value != null) {
            changes.put(field, value);
        }
    }
}
