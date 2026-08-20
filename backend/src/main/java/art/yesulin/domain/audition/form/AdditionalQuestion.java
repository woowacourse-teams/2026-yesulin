package art.yesulin.domain.audition.form;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_additional_questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdditionalQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "form_id", nullable = false)
    private AuditionForm form;

    @Column(nullable = false, length = AdditionalQuestionPlan.MAX_QUESTION_LENGTH)
    private String question;

    @Column(nullable = false)
    private boolean required;

    @Getter(AccessLevel.NONE)
    @Column(name = "question_order", nullable = false)
    private int order;

    AdditionalQuestion(AuditionForm form, AdditionalQuestionPlan plan, int order) {
        this.form = form;
        update(plan, order);
    }

    void update(AdditionalQuestionPlan plan, int order) {
        this.question = plan.question();
        this.required = plan.required();
        this.order = order;
    }

    boolean hasId(long questionId) {
        return id != null && id == questionId;
    }
}
