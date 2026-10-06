package art.yesulin.legacy.application.audition.form;

import art.yesulin.legacy.domain.audition.form.PhotoRequirementPlan;

public record SavePhotoRequirementCommand(Long requirementId, String description, int count) {

    PhotoRequirementPlan toPlan() {
        return new PhotoRequirementPlan(requirementId, description, count);
    }
}
