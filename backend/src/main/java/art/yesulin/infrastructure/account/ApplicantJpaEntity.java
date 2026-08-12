package art.yesulin.infrastructure.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "applicants")
public class ApplicantJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false, unique = true)
    private Long accountId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ApplicantJpaEntity() {
    }

    private ApplicantJpaEntity(Long accountId, LocalDateTime createdAt) {
        this.accountId = accountId;
        this.createdAt = createdAt;
    }

    public static ApplicantJpaEntity create(Long accountId, LocalDateTime createdAt) {
        return new ApplicantJpaEntity(accountId, createdAt);
    }

    public Long id() {
        return id;
    }

    public Long accountId() {
        return accountId;
    }
}
