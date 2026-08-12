package art.yesulin.infrastructure.application;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "application_snapshots")
public class ApplicationSnapshotJpaEntity {

    @Id
    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "schema_version", nullable = false, length = 30)
    private String schemaVersion;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "json")
    private String snapshotJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ApplicationSnapshotJpaEntity() {
    }

    public ApplicationSnapshotJpaEntity(
            Long applicationId,
            String schemaVersion,
            String snapshotJson,
            LocalDateTime createdAt) {
        this.applicationId = applicationId;
        this.schemaVersion = schemaVersion;
        this.snapshotJson = snapshotJson;
        this.createdAt = createdAt;
    }

    public String schemaVersion() {
        return schemaVersion;
    }

    public String snapshotJson() {
        return snapshotJson;
    }
}
