package art.yesulin.infrastructure.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "roles")
public class RoleJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", unique = true, length = 100)
    private String sourceId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    private Integer quota;

    @Column(name = "gender_condition", length = 30)
    private String genderCondition;

    @Column(name = "age_min")
    private Integer ageMin;

    @Column(name = "age_max")
    private Integer ageMax;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected RoleJpaEntity() {
    }

    private RoleJpaEntity(
            String sourceId,
            Long postingId,
            String name,
            String description,
            Integer quota,
            String genderCondition,
            Integer ageMin,
            Integer ageMax,
            LocalDateTime createdAt) {
        this.sourceId = sourceId;
        this.postingId = postingId;
        this.name = name;
        this.description = description;
        this.quota = quota;
        this.genderCondition = genderCondition;
        this.ageMin = ageMin;
        this.ageMax = ageMax;
        this.createdAt = createdAt;
    }

    public static RoleJpaEntity create(
            String sourceId,
            Long postingId,
            String name,
            String description,
            Integer quota,
            String genderCondition,
            Integer ageMin,
            Integer ageMax,
            LocalDateTime createdAt) {
        return new RoleJpaEntity(
                sourceId, postingId, name, description, quota, genderCondition,
                ageMin, ageMax, createdAt);
    }

    public Long id() {
        return id;
    }

    public String sourceId() {
        return sourceId;
    }

    public Long postingId() {
        return postingId;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public Integer quota() {
        return quota;
    }

    public String genderCondition() {
        return genderCondition;
    }

    public Integer ageMin() {
        return ageMin;
    }

    public Integer ageMax() {
        return ageMax;
    }
}
