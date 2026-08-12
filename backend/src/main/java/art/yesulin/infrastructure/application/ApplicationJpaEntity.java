package art.yesulin.infrastructure.application;

import art.yesulin.domain.application.BasicInformation;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications")
public class ApplicationJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", unique = true, length = 100)
    private String sourceId;

    @Column(name = "applicant_id", nullable = false)
    private Long applicantId;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Column(name = "draft_id", unique = true)
    private Long draftId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private int height;

    @Column(nullable = false)
    private int weight;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false, length = 30)
    private String gender;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(nullable = false, length = 200)
    private String residence;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    protected ApplicationJpaEntity() {
    }

    private ApplicationJpaEntity(
            Long applicantId,
            Long postingId,
            Long draftId,
            BasicInformation information,
            LocalDateTime submittedAt) {
        this.applicantId = applicantId;
        this.postingId = postingId;
        this.draftId = draftId;
        this.name = information.name();
        this.height = information.height();
        this.weight = information.weight();
        this.birthDate = information.birthDate();
        this.gender = information.gender().name();
        this.phone = information.phone();
        this.email = information.email();
        this.residence = information.residence();
        this.submittedAt = submittedAt;
    }

    public static ApplicationJpaEntity create(
            Long applicantId,
            Long postingId,
            Long draftId,
            BasicInformation information,
            LocalDateTime submittedAt) {
        return new ApplicationJpaEntity(
                applicantId, postingId, draftId, information, submittedAt);
    }

    public Long id() {
        return id;
    }

    public Long applicantId() {
        return applicantId;
    }

    public Long postingId() {
        return postingId;
    }

    public LocalDateTime submittedAt() {
        return submittedAt;
    }
}
