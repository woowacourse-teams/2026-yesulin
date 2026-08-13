package art.yesulin.infrastructure.screening;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "application_reviews")
public class ApplicationReviewJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "round_number", nullable = false)
    private int roundNumber;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 500)
    private String memo;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    protected ApplicationReviewJpaEntity() {
    }

    private ApplicationReviewJpaEntity(
            Long applicationId, Long roleId, int roundNumber) {
        this.applicationId = applicationId;
        this.roleId = roleId;
        this.roundNumber = roundNumber;
        this.status = "PENDING";
        this.memo = "";
        this.note = "";
    }

    public static ApplicationReviewJpaEntity pending(
            Long applicationId, Long roleId, int roundNumber) {
        return new ApplicationReviewJpaEntity(applicationId, roleId, roundNumber);
    }

    public void update(String status, String memo, String note, LocalDateTime now) {
        if (status != null) {
            this.status = status;
            this.memo = "ETC".equals(status) ? memo : "";
        } else if (memo != null && "ETC".equals(this.status)) {
            this.memo = memo;
        }
        if (note != null) {
            this.note = note;
        }
        this.reviewedAt = now;
    }

    public Long applicationId() {
        return applicationId;
    }

    public Long roleId() {
        return roleId;
    }

    public int roundNumber() {
        return roundNumber;
    }

    public String status() {
        return status;
    }

    public String memo() {
        return memo;
    }

    public String note() {
        return note;
    }
}
