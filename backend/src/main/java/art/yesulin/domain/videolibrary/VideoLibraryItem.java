package art.yesulin.domain.videolibrary;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.domain.video.YouTubeVideoUrl;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "video_library_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoLibraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "video_library_id", nullable = false, updatable = false)
    private VideoLibrary library;

    @Column(name = "url", nullable = false, length = 255)
    private String url;

    @Column(name = "youtube_id", nullable = false, length = 11)
    private String youtubeId;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    VideoLibraryItem(VideoLibrary library, YouTubeVideoUrl video, int displayOrder) {
        this.library = requireNonNull(library, "영상이 속할 영상보관함은 필수입니다.");
        YouTubeVideoUrl validVideo = requireNonNull(video, "YouTube 영상은 필수입니다.");
        this.url = validVideo.url();
        this.youtubeId = validVideo.videoId();
        moveTo(displayOrder);
    }

    void moveTo(int displayOrder) {
        if (displayOrder < 0) {
            throw new IllegalArgumentException("영상 표시 순서는 0 이상이어야 합니다.");
        }
        this.displayOrder = displayOrder;
    }

    boolean hasId(long videoId) {
        return id != null && id == videoId;
    }
}
