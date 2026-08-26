package art.yesulin.domain.videolibrary;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import art.yesulin.domain.video.YouTubeVideoUrl;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "video_libraries", uniqueConstraints = {
        @UniqueConstraint(name = "uk_video_libraries_owner_id", columnNames = "owner_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoLibrary {

    public static final int MAX_VIDEO_COUNT = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Getter(AccessLevel.NONE)
    @Embedded
    private VideoLibraryItems items = new VideoLibraryItems();

    public VideoLibrary(long ownerId) {
        this.ownerId = requirePositive(ownerId, "영상보관함 소유자 ID는 1 이상이어야 합니다.");
    }

    public VideoLibraryItem addVideo(YouTubeVideoUrl video) {
        return items.add(this, video);
    }

    public void moveVideo(long videoId, int displayOrder) {
        items.move(videoId, displayOrder);
    }

    public void deleteVideo(long videoId) {
        items.delete(videoId);
    }

    public List<VideoLibraryItem> getVideos() {
        return items.orderedValues();
    }
}
