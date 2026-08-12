package art.yesulin.infrastructure.draft;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.LocalDateTime;

@Entity
@Table(name = "drafts")
public class DraftJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "posting_id", nullable = false)
    private Long postingId;

    @Column(name = "account_id")
    private Long accountId;

    @Column(name = "content_json", nullable = false, columnDefinition = "json")
    private String contentJson;

    @Column(nullable = false)
    private long revision;

    @Version
    @Column(name = "entity_version", nullable = false)
    private long entityVersion;

    @Column(name = "client_modified_at", nullable = false)
    private LocalDateTime clientModifiedAt;

    @Column(name = "server_modified_at", nullable = false)
    private LocalDateTime serverModifiedAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    protected DraftJpaEntity() {
    }

    private DraftJpaEntity(
            Long postingId,
            Long accountId,
            String contentJson,
            LocalDateTime clientModifiedAt,
            LocalDateTime serverModifiedAt) {
        this.postingId = postingId;
        this.accountId = accountId;
        this.contentJson = contentJson;
        this.revision = 1L;
        this.status = "ACTIVE";
        this.clientModifiedAt = clientModifiedAt;
        this.serverModifiedAt = serverModifiedAt;
    }

    public static DraftJpaEntity createOwned(
            Long postingId,
            Long accountId,
            String contentJson,
            LocalDateTime clientModifiedAt,
            LocalDateTime serverModifiedAt) {
        return new DraftJpaEntity(
                postingId, accountId, contentJson, clientModifiedAt, serverModifiedAt);
    }

    public void attach(long accountId, LocalDateTime serverNow) {
        if (!"ACTIVE".equals(status)) {
            throw new IllegalStateException("활성 Draft만 연결할 수 있습니다.");
        }
        this.accountId = accountId;
        this.serverModifiedAt = serverNow;
    }

    public void markSubmitted(LocalDateTime submittedAt) {
        if (accountId == null || !"ACTIVE".equals(status)) {
            throw new IllegalStateException("계정 소유의 활성 Draft만 제출할 수 있습니다.");
        }
        this.status = "SUBMITTED";
        this.submittedAt = submittedAt;
        this.serverModifiedAt = submittedAt;
    }

    public Long id() {
        return id;
    }

    public Long postingId() {
        return postingId;
    }

    public Long accountId() {
        return accountId;
    }

    public String contentJson() {
        return contentJson;
    }

    public String status() {
        return status;
    }
}
