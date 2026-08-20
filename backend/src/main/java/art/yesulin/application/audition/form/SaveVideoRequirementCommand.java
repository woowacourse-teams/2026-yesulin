package art.yesulin.application.audition.form;

import art.yesulin.domain.audition.form.VideoRequirementPlan;

public record SaveVideoRequirementCommand(Long requirementId, String description) {

    VideoRequirementPlan toPlan() {
        return new VideoRequirementPlan(requirementId, description);
    }
}
