package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_SCHEDULE;

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
public class ScreeningStages {

    @OneToMany(mappedBy = "schedule", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("order ASC")
    private List<ScreeningStage> values = new ArrayList<>();

    ScreeningStages(AuditionSchedule schedule, ScreeningStagePlans plans) {
        replace(schedule, plans);
    }

    void replace(AuditionSchedule schedule, ScreeningStagePlans plans) {
        List<ScreeningStagePlan> stagePlans = plans.values();
        List<ScreeningStage> changedStages = new ArrayList<>(stagePlans.size());
        for (int order = 0; order < stagePlans.size(); order++) {
            changedStages.add(updateOrCreate(schedule, stagePlans.get(order), order));
        }
        values.clear();
        values.addAll(changedStages);
    }

    private ScreeningStage updateOrCreate(AuditionSchedule schedule, ScreeningStagePlan plan, int order) {
        if (plan.stageId() == null) {
            return new ScreeningStage(schedule, plan, order);
        }
        ScreeningStage stage = find(plan.stageId());
        stage.update(plan, order);
        return stage;
    }

    private ScreeningStage find(long stageId) {
        return values.stream()
                .filter(stage -> stage.hasId(stageId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(INVALID_SCHEDULE, "공고 일정에서 전형을 찾을 수 없습니다."));
    }

    List<ScreeningStage> values() {
        return List.copyOf(values);
    }
}
