package art.yesulin.feedback.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 의견에 첨부한 이미지 한 장. 비공개 저장소의 키만 저장하고 운영자 화면에서만 잠깐 열리는 주소로 보여 준다. */
@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeedbackImage {

    @Column(name = "object_key", nullable = false, length = 120, updatable = false)
    private String objectKey;

    @Column(name = "content_type", nullable = false, length = 20, updatable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long size;

    public FeedbackImage(String objectKey, String contentType, long size) {
        this.objectKey = Objects.requireNonNull(objectKey);
        this.contentType = Objects.requireNonNull(contentType);
        this.size = size;
    }
}
