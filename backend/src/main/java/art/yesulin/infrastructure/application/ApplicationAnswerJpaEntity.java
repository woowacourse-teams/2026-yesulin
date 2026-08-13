package art.yesulin.infrastructure.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "application_answers")
public class ApplicationAnswerJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "field_key", nullable = false, length = 100)
    private String fieldKey;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "answer_json", nullable = false, columnDefinition = "json")
    private String answerJson;

    @Column(name = "answer_order", nullable = false)
    private int answerOrder;

    protected ApplicationAnswerJpaEntity() {
    }

    public ApplicationAnswerJpaEntity(
            Long applicationId,
            String fieldKey,
            String label,
            String answerJson,
            int answerOrder) {
        this.applicationId = applicationId;
        this.fieldKey = fieldKey;
        this.label = label;
        this.answerJson = answerJson;
        this.answerOrder = answerOrder;
    }

    public String fieldKey() {
        return fieldKey;
    }

    public String answerJson() {
        return answerJson;
    }
}
