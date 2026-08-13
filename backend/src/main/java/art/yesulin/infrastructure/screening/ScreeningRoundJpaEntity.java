package art.yesulin.infrastructure.screening;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "screening_rounds")
public class ScreeningRoundJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "round_number", nullable = false)
    private int roundNumber;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(columnDefinition = "text")
    private String note;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    protected ScreeningRoundJpaEntity() {
    }

    private ScreeningRoundJpaEntity(
            Long roleId,
            int roundNumber,
            String name,
            LocalDate scheduledDate,
            String note,
            String status) {
        this.roleId = roleId;
        this.roundNumber = roundNumber;
        this.name = name;
        this.scheduledDate = scheduledDate;
        this.note = note;
        this.status = status;
    }

    public static ScreeningRoundJpaEntity create(
            Long roleId,
            int roundNumber,
            String name,
            LocalDate scheduledDate,
            String note) {
        return new ScreeningRoundJpaEntity(
                roleId, roundNumber, name, scheduledDate, note,
                roundNumber == 1 ? "OPEN" : "LOCKED");
    }

    public void close(LocalDateTime now) {
        this.status = "CLOSED";
        this.closedAt = now;
    }

    public void open() {
        if ("LOCKED".equals(status)) {
            status = "OPEN";
        }
    }

    public Long id() {
        return id;
    }

    public Long roleId() {
        return roleId;
    }

    public int roundNumber() {
        return roundNumber;
    }

    public String name() {
        return name;
    }

    public LocalDate scheduledDate() {
        return scheduledDate;
    }

    public String note() {
        return note;
    }

    public String status() {
        return status;
    }

    public LocalDateTime closedAt() {
        return closedAt;
    }
}
