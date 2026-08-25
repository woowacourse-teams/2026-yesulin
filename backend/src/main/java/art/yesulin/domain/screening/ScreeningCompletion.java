package art.yesulin.domain.screening;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "screening_completions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_screening_completions_role_id", columnNames = "audition_role_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScreeningCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audition_role_id", nullable = false, updatable = false)
    private long auditionRoleId;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    public ScreeningCompletion(long auditionRoleId, Instant completedAt) {
        this.auditionRoleId = requirePositive(auditionRoleId, "공고 배역 ID는 1 이상이어야 합니다.");
        this.completedAt = Objects.requireNonNull(completedAt, "전형 종료 시각은 필수입니다.");
    }
}
