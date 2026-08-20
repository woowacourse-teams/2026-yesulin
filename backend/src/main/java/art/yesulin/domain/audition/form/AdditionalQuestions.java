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
public class AdditionalQuestions {

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("order ASC")
    private List<AdditionalQuestion> values = new ArrayList<>();

    AdditionalQuestions(AuditionForm form, AdditionalQuestionPlans plans) {
        replace(form, plans);
    }

    void replace(AuditionForm form, AdditionalQuestionPlans plans) {
        List<AdditionalQuestionPlan> questionPlans = plans.values();
        List<AdditionalQuestion> changedQuestions = new ArrayList<>(questionPlans.size());
        for (int order = 0; order < questionPlans.size(); order++) {
            changedQuestions.add(updateOrCreate(form, questionPlans.get(order), order));
        }
        values.clear();
        values.addAll(changedQuestions);
    }

    private AdditionalQuestion updateOrCreate(AuditionForm form, AdditionalQuestionPlan plan, int order) {
        if (plan.questionId() == null) {
            return new AdditionalQuestion(form, plan, order);
        }
        AdditionalQuestion question = find(plan.questionId());
        question.update(plan, order);
        return question;
    }

    private AdditionalQuestion find(long questionId) {
        return values.stream()
                .filter(question -> question.hasId(questionId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(INVALID_FORM, "지원 폼에서 추가 질문을 찾을 수 없습니다."));
    }

    List<AdditionalQuestion> values() {
        return List.copyOf(values);
    }
}
