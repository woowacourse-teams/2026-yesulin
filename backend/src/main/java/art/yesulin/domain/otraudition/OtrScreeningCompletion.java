package art.yesulin.domain.otraudition;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "otr_screening_completions", uniqueConstraints = @UniqueConstraint(
        name = "uk_otr_screening_completions_audition_role", columnNames = {"otr_audition_id", "role_order"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OtrScreeningCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "otr_audition_id", nullable = false, updatable = false)
    private long otrAuditionId;

    @Column(name = "role_order", nullable = false, updatable = false)
    private int roleOrder;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    public OtrScreeningCompletion(long otrAuditionId, int roleOrder, Instant completedAt) {
        this.otrAuditionId = otrAuditionId;
        this.roleOrder = roleOrder;
        this.completedAt = completedAt;
    }
}
