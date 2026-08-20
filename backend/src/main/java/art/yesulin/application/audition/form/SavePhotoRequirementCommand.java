package art.yesulin.application.audition.form;

import art.yesulin.domain.audition.form.PhotoRequirementPlan;

public record SavePhotoRequirementCommand(Long requirementId, String description, int count) {

    PhotoRequirementPlan toPlan() {
        return new PhotoRequirementPlan(requirementId, description, count);
    }
}
