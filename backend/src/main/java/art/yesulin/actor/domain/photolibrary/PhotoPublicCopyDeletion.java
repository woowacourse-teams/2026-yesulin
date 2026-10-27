package art.yesulin.actor.domain.photolibrary;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requireText;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 커밋 뒤 저장소에서 지우지 못한 공개 사본 한 건. 사진에서는 이미 떼어 냈지만 공개 주소로 계속 열리므로, 정리 작업이 지울
 * 때까지 키를 남겨 둔다.
 */
@Entity
@Table(name = "photo_public_copy_deletions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoPublicCopyDeletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public PhotoPublicCopyDeletion(String objectKey, Instant createdAt) {
        this.objectKey = requireText(objectKey, "지울 공개 사본 키는 필수입니다.");
        this.createdAt = requireNonNull(createdAt, "공개 사본 삭제 실패 시각은 필수입니다.");
    }
}
