package art.yesulin.auditionpost.domain.upload;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공고에 넣으려고 브라우저가 저장소로 바로 올리는 사진·첨부 한 건. 공고를 저장할 때 올린 사람만 공고 파일로 확정할 수 있고,
 * 확정하면 이 기록을 지운다. 확정하지 않은 업로드는 정리 작업이 저장소 객체와 함께 지운다.
 */
@Entity
@Table(name = "audition_post_uploads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionPostUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "object_key", nullable = false, updatable = false, length = 500)
    private String objectKey;

    @Column(name = "uploader_id", nullable = false, updatable = false)
    private long uploaderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private AuditionPostFileKind kind;

    @Column(
            name = "original_filename", nullable = false, updatable = false,
            length = AuditionPostFile.MAX_FILENAME_LENGTH
    )
    private String originalFilename;

    @Column(name = "content_type", nullable = false, updatable = false, length = 100)
    private String contentType;

    @Column(nullable = false, updatable = false)
    private long size;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AuditionPostUpload(AuditionPostFile file, long uploaderId, Instant createdAt) {
        if (file == null) {
            throw new BusinessException(INVALID_INPUT, "올릴 파일 정보는 필수입니다.");
        }
        if (uploaderId <= 0) {
            throw new BusinessException(INVALID_INPUT, "올린 사람이 올바르지 않습니다.");
        }
        if (createdAt == null) {
            throw new BusinessException(INVALID_INPUT, "올린 시각은 필수입니다.");
        }
        this.objectKey = file.getObjectKey();
        this.uploaderId = uploaderId;
        this.kind = file.getKind();
        this.originalFilename = file.getOriginalFilename();
        this.contentType = file.getContentType();
        this.size = file.getSize();
        this.createdAt = createdAt;
    }

    public boolean isUploadedBy(long memberId) {
        return uploaderId == memberId;
    }

    public AuditionPostFile toFile() {
        return new AuditionPostFile(kind, objectKey, originalFilename, contentType, size);
    }
}
