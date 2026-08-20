package art.yesulin.application.audition.form;

import art.yesulin.domain.audition.form.PhotoRequirement;

public record PhotoRequirementResult(long id, int order, String description, int count) {

    static PhotoRequirementResult from(PhotoRequirement requirement, int order) {
        return new PhotoRequirementResult(
                requirement.getId(), order, requirement.getDescription(), requirement.getCount()
        );
    }
}
