package art.yesulin.legacy.application.audition.form;

import art.yesulin.legacy.domain.audition.form.VideoRequirementPlan;

public record SaveVideoRequirementCommand(Long requirementId, String description) {

    VideoRequirementPlan toPlan() {
        return new VideoRequirementPlan(requirementId, description);
    }
}
