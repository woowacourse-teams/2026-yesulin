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
public class PhotoRequirements {

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("order ASC")
    private List<PhotoRequirement> values = new ArrayList<>();

    PhotoRequirements(AuditionForm form, PhotoRequirementPlans plans) {
        replace(form, plans);
    }

    void replace(AuditionForm form, PhotoRequirementPlans plans) {
        List<PhotoRequirementPlan> requirementPlans = plans.values();
        List<PhotoRequirement> changedRequirements = new ArrayList<>(requirementPlans.size());
        for (int order = 0; order < requirementPlans.size(); order++) {
            changedRequirements.add(updateOrCreate(form, requirementPlans.get(order), order));
        }
        values.clear();
        values.addAll(changedRequirements);
    }

    private PhotoRequirement updateOrCreate(AuditionForm form, PhotoRequirementPlan plan, int order) {
        if (plan.requirementId() == null) {
            return new PhotoRequirement(form, plan, order);
        }
        PhotoRequirement requirement = find(plan.requirementId());
        requirement.update(plan, order);
        return requirement;
    }

    private PhotoRequirement find(long requirementId) {
        return values.stream()
                .filter(requirement -> requirement.hasId(requirementId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(INVALID_FORM, "지원 폼에서 사진 요구사항을 찾을 수 없습니다."));
    }

    List<PhotoRequirement> values() {
        return List.copyOf(values);
    }
}
