package art.yesulin.infrastructure.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "performance_role_templates")
public class PerformanceRoleTemplateJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "performance_id", nullable = false)
    private Long performanceId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "gender_condition", nullable = false, length = 30)
    private String genderCondition;

    @Column(name = "age_min", nullable = false)
    private int ageMin;

    @Column(name = "age_max", nullable = false)
    private int ageMax;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected PerformanceRoleTemplateJpaEntity() {
    }

    private PerformanceRoleTemplateJpaEntity(
            Long performanceId,
            String name,
            String description,
            String genderCondition,
            int ageMin,
            int ageMax,
            LocalDateTime createdAt) {
        this.performanceId = performanceId;
        this.name = name;
        this.description = description;
        this.genderCondition = genderCondition;
        this.ageMin = ageMin;
        this.ageMax = ageMax;
        this.createdAt = createdAt;
    }

    public static PerformanceRoleTemplateJpaEntity create(
            Long performanceId,
            String name,
            String description,
            String genderCondition,
            int ageMin,
            int ageMax,
            LocalDateTime createdAt) {
        return new PerformanceRoleTemplateJpaEntity(
                performanceId, name, description, genderCondition, ageMin, ageMax, createdAt);
    }

    public Long id() {
        return id;
    }

    public Long performanceId() {
        return performanceId;
    }

    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public String genderCondition() {
        return genderCondition;
    }

    public int ageMin() {
        return ageMin;
    }

    public int ageMax() {
        return ageMax;
    }
}
