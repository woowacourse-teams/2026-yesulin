package art.yesulin.file.domain.thumbnail;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "poster_thumbnails")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PosterThumbnailJob {

    @Id
    @Column(name = "source_key", length = 500)
    private String sourceKey;

    @Column(nullable = false, length = 20)
    private String state;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "available_at", nullable = false)
    private Instant availableAt;

    public boolean removing() {
        return "REMOVING".equals(state);
    }
}
