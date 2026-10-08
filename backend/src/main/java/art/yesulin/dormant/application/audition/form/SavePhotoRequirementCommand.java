package art.yesulin.dormant.application.audition.form;

import art.yesulin.dormant.domain.audition.form.PhotoRequirementPlan;

public record SavePhotoRequirementCommand(Long requirementId, String description, int count) {

    PhotoRequirementPlan toPlan() {
        return new PhotoRequirementPlan(requirementId, description, count);
    }
}
