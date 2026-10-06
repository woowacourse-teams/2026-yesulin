package art.yesulin.legacy.application.audition.form;

import art.yesulin.legacy.domain.audition.form.VideoRequirement;

public record VideoRequirementResult(long id, int order, String description) {

    static VideoRequirementResult from(VideoRequirement requirement, int order) {
        return new VideoRequirementResult(requirement.getId(), order, requirement.getDescription());
    }
}
