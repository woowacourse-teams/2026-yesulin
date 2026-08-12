package art.yesulin.infrastructure.applicant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "applicant_profiles")
public class ApplicantProfileJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "applicant_id", nullable = false, unique = true)
    private Long applicantId;

    @Column(name = "activity_name", length = 100)
    private String activityName;

    @Column(length = 100)
    private String name;

    private Integer height;
    private Integer weight;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(length = 30)
    private String gender;

    @Column(length = 30)
    private String phone;

    @Column(length = 320)
    private String email;

    @Column(length = 200)
    private String residence;

    @Column(name = "additional_information", nullable = false, columnDefinition = "json")
    private String additionalInformation;

    @Column(name = "consented_at")
    private LocalDateTime consentedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ApplicantProfileJpaEntity() {
    }

    private ApplicantProfileJpaEntity(Long applicantId) {
        this.applicantId = applicantId;
        this.additionalInformation = "{}";
    }

    public static ApplicantProfileJpaEntity create(Long applicantId) {
        return new ApplicantProfileJpaEntity(applicantId);
    }

    public void update(
            String activityName,
            String name,
            Integer height,
            Integer weight,
            LocalDate birthDate,
            String gender,
            String phone,
            String email,
            String residence,
            String additionalInformation,
            LocalDateTime consentedAt,
            LocalDateTime updatedAt) {
        this.activityName = activityName;
        this.name = name;
        this.height = height;
        this.weight = weight;
        this.birthDate = birthDate;
        this.gender = gender;
        this.phone = phone;
        this.email = email;
        this.residence = residence;
        this.additionalInformation = additionalInformation;
        this.consentedAt = consentedAt;
        this.updatedAt = updatedAt;
    }

    public Long id() {
        return id;
    }

    public Long applicantId() {
        return applicantId;
    }

    public String activityName() {
        return activityName;
    }

    public String name() {
        return name;
    }

    public Integer height() {
        return height;
    }

    public Integer weight() {
        return weight;
    }

    public LocalDate birthDate() {
        return birthDate;
    }

    public String gender() {
        return gender;
    }

    public String phone() {
        return phone;
    }

    public String email() {
        return email;
    }

    public String residence() {
        return residence;
    }

    public String additionalInformation() {
        return additionalInformation;
    }

    public LocalDateTime consentedAt() {
        return consentedAt;
    }

    public LocalDateTime updatedAt() {
        return updatedAt;
    }
}
