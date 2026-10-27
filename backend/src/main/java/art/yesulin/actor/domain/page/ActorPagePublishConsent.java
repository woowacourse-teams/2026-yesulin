package art.yesulin.actor.domain.page;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "actor_page_publish_consents", indexes = {
        @Index(name = "idx_actor_page_publish_consents_page", columnList = "actor_page_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActorPagePublishConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_page_id", nullable = false, updatable = false)
    private long actorPageId;

    @Column(name = "member_id", nullable = false, updatable = false)
    private long memberId;

    @Column(name = "document_version", nullable = false, updatable = false, length = 100)
    private String documentVersion;

    @Column(name = "agreed_at", nullable = false, updatable = false)
    private Instant agreedAt;

    public ActorPagePublishConsent(long actorPageId, long memberId, String documentVersion, Instant agreedAt) {
        this.actorPageId = actorPageId;
        this.memberId = memberId;
        this.documentVersion = documentVersion;
        this.agreedAt = agreedAt;
    }
}
