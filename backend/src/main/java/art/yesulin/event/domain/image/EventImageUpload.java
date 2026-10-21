package art.yesulin.event.domain.image;

import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 브라우저가 저장소로 바로 올린 이벤트 이미지 한 건. 운영자가 이벤트를 저장하면서 확정하면 이 기록을 지운다. 확정하지 않은
 * 업로드는 정리 작업이 저장소 객체와 함께 지운다.
 */
@Entity
@Table(name = "event_image_uploads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventImageUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "uploader_id", nullable = false, updatable = false)
    private long uploaderId;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Column(nullable = false, updatable = false)
    private long size;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public EventImageUpload(String objectKey, long uploaderId, String contentType, long size, Instant createdAt) {
        if (objectKey == null || objectKey.isBlank() || contentType == null || contentType.isBlank()) {
            throw new BusinessException(INVALID_INPUT, "올릴 이미지 정보는 필수입니다.");
        }
        if (uploaderId <= 0) {
            throw new BusinessException(INVALID_INPUT, "올린 사람이 올바르지 않습니다.");
        }
        if (size <= 0) {
            throw new BusinessException(INVALID_INPUT, "빈 이미지는 올릴 수 없습니다.");
        }
        this.objectKey = objectKey;
        this.uploaderId = uploaderId;
        this.contentType = contentType;
        this.size = size;
        this.createdAt = Objects.requireNonNull(createdAt);
    }

    /** 올린 운영자만 확정할 수 있다. */
    public boolean isClaimableBy(long adminId) {
        return uploaderId == adminId;
    }
}
