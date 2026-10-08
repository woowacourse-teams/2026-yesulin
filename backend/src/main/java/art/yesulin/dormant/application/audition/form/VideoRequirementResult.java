package art.yesulin.dormant.application.audition.form;

import art.yesulin.dormant.domain.audition.form.VideoRequirement;

public record VideoRequirementResult(long id, int order, String description) {

    static VideoRequirementResult from(VideoRequirement requirement, int order) {
        return new VideoRequirementResult(requirement.getId(), order, requirement.getDescription());
    }
}
