package art.yesulin.domain.performance;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "performance_roles", uniqueConstraints = {
        @UniqueConstraint(name = "uk_performance_roles_performance_name", columnNames = {"performance_id", "name"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformanceRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "performance_id", nullable = false)
    private Performance performance;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 300)
    private String description;

    PerformanceRole(Performance performance, String name, String description) {
        this.performance = requireNonNull(performance, "배역이 속할 공연은 필수입니다.");
        update(name, description);
    }

    void update(String name, String description) {
        this.name = requireText(name, "배역 이름은 필수입니다.");
        this.description = requireSingleLine(description);
    }

    private String requireSingleLine(String value) {
        String normalized = requireText(value, "배역 한 줄 설명은 필수입니다.");
        if (normalized.contains("\n") || normalized.contains("\r")) {
            throw new IllegalArgumentException("배역 설명은 한 줄로 작성해야 합니다.");
        }
        return normalized;
    }

    boolean hasSameName(String otherName) {
        return name.equalsIgnoreCase(requireText(otherName, "배역 이름은 필수입니다."));
    }
}
