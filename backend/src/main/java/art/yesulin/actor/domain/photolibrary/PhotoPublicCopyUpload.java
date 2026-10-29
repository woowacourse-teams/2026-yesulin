package art.yesulin.actor.domain.photolibrary;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;
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
 * 브라우저가 저장소로 바로 올린 공개 사본 한 건. 올린 배우가 같은 사진에 확정하면 이 기록을 지운다. 확정하지 않은 업로드는
 * 정리 작업이 저장소 객체와 함께 지운다.
 */
@Entity
@Table(name = "photo_public_copy_uploads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PhotoPublicCopyUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Column(name = "photo_id", nullable = false, updatable = false)
    private long photoId;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Column(nullable = false, updatable = false)
    private long size;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public PhotoPublicCopyUpload(
            String objectKey, long ownerId, long photoId, String contentType, long size, Instant createdAt
    ) {
        this.objectKey = requireText(objectKey, "공개 사본 키는 필수입니다.");
        this.ownerId = requirePositive(ownerId, "공개 사본을 올린 배우 ID는 1 이상이어야 합니다.");
        this.photoId = requirePositive(photoId, "공개 사본의 사진 ID는 1 이상이어야 합니다.");
        this.contentType = requireText(contentType, "공개 사본 형식은 필수입니다.");
        this.size = requirePositive(size, "빈 공개 사본은 올릴 수 없습니다.");
        this.createdAt = requireNonNull(createdAt, "공개 사본 업로드 시각은 필수입니다.");
    }

    /** 올린 배우가 업로드를 준비한 그 사진에만 확정할 수 있다. */
    public boolean isClaimableBy(long ownerId, long photoId) {
        return this.ownerId == ownerId && this.photoId == photoId;
    }
}
