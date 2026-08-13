package art.yesulin.infrastructure.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "posting_fields")
public class PostingFieldJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", length = 100)
    private String sourceId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Column(name = "field_key", nullable = false, length = 100)
    private String fieldKey;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "input_type", nullable = false, length = 30)
    private String inputType;

    @Column(name = "required", nullable = false)
    private boolean requiredField;

    @Column(nullable = false)
    private boolean custom;

    @Column(name = "section_name", nullable = false, length = 50)
    private String sectionName;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "config_json", columnDefinition = "json")
    private String configJson;

    protected PostingFieldJpaEntity() {
    }

    private PostingFieldJpaEntity(
            Long postingId,
            String sourceId,
            String fieldKey,
            String label,
            String inputType,
            boolean requiredField,
            boolean custom,
            String sectionName,
            int displayOrder,
            String configJson) {
        this.postingId = postingId;
        this.sourceId = sourceId;
        this.fieldKey = fieldKey;
        this.label = label;
        this.inputType = inputType;
        this.requiredField = requiredField;
        this.custom = custom;
        this.sectionName = sectionName;
        this.displayOrder = displayOrder;
        this.configJson = configJson;
    }

    public static PostingFieldJpaEntity create(
            Long postingId,
            String sourceId,
            String fieldKey,
            String label,
            String inputType,
            boolean requiredField,
            boolean custom,
            String sectionName,
            int displayOrder,
            String configJson) {
        return new PostingFieldJpaEntity(
                postingId, sourceId, fieldKey, label, inputType, requiredField,
                custom, sectionName, displayOrder, configJson);
    }

    public Long postingId() {
        return postingId;
    }

    public String fieldKey() {
        return fieldKey;
    }

    public Long id() {
        return id;
    }

    public String label() {
        return label;
    }

    public String inputType() {
        return inputType;
    }

    public boolean requiredField() {
        return requiredField;
    }

    public boolean custom() {
        return custom;
    }

    public String sectionName() {
        return sectionName;
    }

    public int displayOrder() {
        return displayOrder;
    }

    public String configJson() {
        return configJson;
    }
}
