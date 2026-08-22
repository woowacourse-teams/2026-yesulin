package art.yesulin.infrastructure.screening.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ScreeningSubmissionVideoEntity {

    @Column(name = "video_label", nullable = false, length = 255)
    private String label;

    @Column(name = "video_url", nullable = false, length = 2_000)
    private String url;
}
