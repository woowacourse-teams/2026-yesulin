package art.yesulin.community.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "community_likes", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "owner_hash"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CommunityLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private long postId;

    @Column(nullable = false, length = 64, updatable = false)
    private String ownerHash;

    public CommunityLike(long postId, String ownerHash) {
        this.postId = postId;
        this.ownerHash = ownerHash;
    }
}
