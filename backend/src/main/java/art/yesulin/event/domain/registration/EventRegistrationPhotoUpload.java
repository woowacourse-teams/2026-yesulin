package art.yesulin.event.domain.registration;

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
 * 참가 신청자가 저장소로 바로 올린 프로필 사진 한 건. 로그인 없이 올리므로 올린 사람은 없고, 업로드 키를 아는 신청자가 신청을
 * 보내면서 한 번 확정한다. 확정하면 이 기록을 지우고, 확정하지 않은 업로드는 정리 작업이 저장소 객체와 함께 지운다.
 */
@Entity
@Table(name = "event_registration_photo_uploads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventRegistrationPhotoUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Column(nullable = false, updatable = false)
    private long size;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public EventRegistrationPhotoUpload(String objectKey, String contentType, long size, Instant createdAt) {
        if (objectKey == null || objectKey.isBlank() || contentType == null || contentType.isBlank()) {
            throw new BusinessException(INVALID_INPUT, "올릴 사진 정보는 필수입니다.");
        }
        if (size <= 0) {
            throw new BusinessException(INVALID_INPUT, "빈 사진은 올릴 수 없습니다.");
        }
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.size = size;
        this.createdAt = Objects.requireNonNull(createdAt);
    }
}
