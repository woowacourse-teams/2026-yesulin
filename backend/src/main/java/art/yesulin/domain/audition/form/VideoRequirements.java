package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoRequirements {

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("order ASC")
    private List<VideoRequirement> values = new ArrayList<>();

    VideoRequirements(AuditionForm form, VideoRequirementPlans plans) {
        replace(form, plans);
    }

    void replace(AuditionForm form, VideoRequirementPlans plans) {
        List<VideoRequirementPlan> requirementPlans = plans.values();
        List<VideoRequirement> changedRequirements = new ArrayList<>(requirementPlans.size());
        for (int order = 0; order < requirementPlans.size(); order++) {
            changedRequirements.add(updateOrCreate(form, requirementPlans.get(order), order));
        }
        values.clear();
        values.addAll(changedRequirements);
    }

    private VideoRequirement updateOrCreate(AuditionForm form, VideoRequirementPlan plan, int order) {
        if (plan.requirementId() == null) {
            return new VideoRequirement(form, plan, order);
        }
        VideoRequirement requirement = find(plan.requirementId());
        requirement.update(plan, order);
        return requirement;
    }

    private VideoRequirement find(long requirementId) {
        return values.stream()
                .filter(requirement -> requirement.hasId(requirementId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(INVALID_FORM, "지원 폼에서 영상 요구사항을 찾을 수 없습니다."));
    }

    List<VideoRequirement> values() {
        return List.copyOf(values);
    }
}
