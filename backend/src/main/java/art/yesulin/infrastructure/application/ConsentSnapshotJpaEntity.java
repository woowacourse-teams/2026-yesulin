package art.yesulin.infrastructure.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "consent_snapshots")
public class ConsentSnapshotJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private Long applicationId;

    @Column(name = "consent_type", nullable = false, length = 40)
    private String consentType;

    @Column(name = "document_version", nullable = false, length = 50)
    private String documentVersion;

    @Column(name = "disclosure_json", nullable = false, columnDefinition = "json")
    private String disclosureJson;

    @Column(name = "agreed_at", nullable = false)
    private LocalDateTime agreedAt;

    protected ConsentSnapshotJpaEntity() {
    }

    public ConsentSnapshotJpaEntity(
            Long applicationId,
            String consentType,
            String documentVersion,
            String disclosureJson,
            LocalDateTime agreedAt) {
        this.applicationId = applicationId;
        this.consentType = consentType;
        this.documentVersion = documentVersion;
        this.disclosureJson = disclosureJson;
        this.agreedAt = agreedAt;
    }
}
