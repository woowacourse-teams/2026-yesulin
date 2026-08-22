package art.yesulin.infrastructure.screening.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ScreeningSubmissionPhotoEntity {

    @Column(name = "photo_label", nullable = false, length = 255)
    private String label;

    @Column(name = "file_id", nullable = false)
    private long fileId;
}
