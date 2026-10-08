package art.yesulin.dormant.application.audition.form;

import art.yesulin.dormant.domain.audition.form.VideoRequirementPlan;

public record SaveVideoRequirementCommand(Long requirementId, String description) {

    VideoRequirementPlan toPlan() {
        return new VideoRequirementPlan(requirementId, description);
    }
}
