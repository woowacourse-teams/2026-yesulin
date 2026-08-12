package art.yesulin.infrastructure.company;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "company_members")
public class CompanyMemberJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 30)
    private String role;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected CompanyMemberJpaEntity() {
    }

    private CompanyMemberJpaEntity(Long accountId, Long companyId, LocalDateTime createdAt) {
        this.accountId = accountId;
        this.companyId = companyId;
        this.role = "ADMIN";
        this.createdAt = createdAt;
    }

    public static CompanyMemberJpaEntity createAdmin(
            Long accountId, Long companyId, LocalDateTime createdAt) {
        return new CompanyMemberJpaEntity(accountId, companyId, createdAt);
    }

    public Long companyId() {
        return companyId;
    }

    public String role() {
        return role;
    }
}
