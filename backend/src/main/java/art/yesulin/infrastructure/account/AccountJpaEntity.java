package art.yesulin.infrastructure.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
public class AccountJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected AccountJpaEntity() {
    }

    private AccountJpaEntity(String email, String passwordHash, LocalDateTime now) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = "ACTIVE";
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static AccountJpaEntity create(String email, String passwordHash, LocalDateTime now) {
        return new AccountJpaEntity(email, passwordHash, now);
    }

    public Long id() {
        return id;
    }

    public String email() {
        return email;
    }

    public String passwordHash() {
        return passwordHash;
    }

    public String status() {
        return status;
    }
}
