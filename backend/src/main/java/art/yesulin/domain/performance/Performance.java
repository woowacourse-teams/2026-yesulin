package art.yesulin.domain.performance;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.domain.performance.event.PerformanceCreatedEvent;
import art.yesulin.domain.performance.event.PerformancePosterChangedEvent;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.data.domain.AbstractAggregateRoot;

@Entity
@Table(name = "performances", indexes = {
        @Index(name = "idx_performances_owner_id", columnList = "owner_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Performance extends AbstractAggregateRoot<Performance> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Column(name = "poster_file_id", nullable = false)
    private long posterFileId;

    @Column(nullable = false, length = 200)
    private String title;

    @Embedded
    private PerformanceVenue venue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Getter(AccessLevel.NONE)
    @Embedded
    private PerformanceRoles roles = new PerformanceRoles();

    public Performance(long ownerId, long posterFileId, String title, String roadAddress) {
        this(ownerId, posterFileId, title, PerformanceVenue.fromRoadAddress(roadAddress));
    }

    public Performance(long ownerId, long posterFileId, String title, PerformanceVenue venue) {
        this.ownerId = requirePositive(ownerId, "공연 소유자 ID는 1 이상이어야 합니다.");
        this.posterFileId = requirePositive(posterFileId, "포스터 파일 ID는 1 이상이어야 합니다.");
        this.title = requireText(title, "공연 제목은 필수입니다.");
        this.venue = venue;
    }

    public PerformanceRole addRole(String name, String description) {
        return roles.add(this, name, description);
    }

    public void clearRoles() {
        roles.clear();
    }

    public void updateBasicInformation(String title, String roadAddress) {
        updateBasicInformation(title, PerformanceVenue.fromRoadAddress(roadAddress));
    }

    public void updateBasicInformation(String title, PerformanceVenue venue) {
        this.title = requireText(title, "공연 제목은 필수입니다.");
        this.venue = venue;
    }

    public void updatePoster(long posterFileId) {
        final long changedPosterFileId = requirePositive(posterFileId, "포스터 파일 ID는 1 이상이어야 합니다.");
        final long previousPosterFileId = this.posterFileId;
        this.posterFileId = changedPosterFileId;
        if (previousPosterFileId != changedPosterFileId) {
            registerEvent(new PerformancePosterChangedEvent(id, ownerId, previousPosterFileId, changedPosterFileId));
        }
    }

    @PostPersist
    private void registerCreatedEvent() {
        registerEvent(new PerformanceCreatedEvent(id, ownerId, posterFileId));
    }

    public List<PerformanceRole> getRoles() {
        return roles.values();
    }

    public String getRoadAddress() {
        return venue.getRoadAddress();
    }
}
