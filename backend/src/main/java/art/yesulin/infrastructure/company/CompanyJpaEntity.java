package art.yesulin.infrastructure.company;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "companies")
public class CompanyJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", unique = true, length = 100)
    private String sourceId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "business_number", length = 30)
    private String businessNumber;

    @Column(name = "representative_name", length = 100)
    private String representativeName;

    @Column(name = "contact_name", length = 100)
    private String contactName;

    @Column(name = "contact_email", length = 320)
    private String contactEmail;

    @Column(name = "contact_role", length = 100)
    private String contactRole;

    @Column(name = "logo_url", length = 2048)
    private String logoUrl;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "verification_status", nullable = false, length = 20)
    private String verificationStatus;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected CompanyJpaEntity() {
    }

    private CompanyJpaEntity(
            String sourceId,
            String name,
            String businessNumber,
            String representativeName,
            String contactName,
            String contactEmail,
            String verificationStatus,
            LocalDateTime verifiedAt,
            LocalDateTime now) {
        this.sourceId = sourceId;
        this.name = name;
        this.businessNumber = businessNumber;
        this.representativeName = representativeName;
        this.contactName = contactName;
        this.contactEmail = contactEmail;
        this.verificationStatus = verificationStatus;
        this.verifiedAt = verifiedAt;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static CompanyJpaEntity create(
            String name,
            String businessNumber,
            String representativeName,
            String contactName,
            String contactEmail,
            LocalDateTime now) {
        return new CompanyJpaEntity(
                null, name, businessNumber, representativeName, contactName, contactEmail,
                "PENDING", null, now);
    }

    public static CompanyJpaEntity importVerified(
            String sourceId,
            String name,
            String businessNumber,
            String representativeName,
            String contactName,
            String contactEmail,
            LocalDateTime verifiedAt,
            LocalDateTime now) {
        return new CompanyJpaEntity(
                sourceId, name, businessNumber, representativeName, contactName, contactEmail,
                "VERIFIED", verifiedAt, now);
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String verificationStatus() {
        return verificationStatus;
    }

    public String businessNumber() {
        return businessNumber;
    }

    public String representativeName() {
        return representativeName;
    }

    public String contactName() {
        return contactName;
    }

    public String contactEmail() {
        return contactEmail;
    }

    public LocalDateTime verifiedAt() {
        return verifiedAt;
    }

    public String sourceId() {
        return sourceId;
    }

    public String contactRole() {
        return contactRole;
    }

    public String logoUrl() {
        return logoUrl;
    }

    public String description() {
        return description;
    }

    public void updateProfile(
            String name,
            String contactName,
            String contactRole,
            String description,
            LocalDateTime now) {
        this.name = name;
        this.contactName = contactName;
        this.contactRole = contactRole;
        this.description = description;
        this.updatedAt = now;
    }
}
