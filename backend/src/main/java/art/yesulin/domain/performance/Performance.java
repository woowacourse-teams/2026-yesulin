package art.yesulin.domain.performance;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
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
import jakarta.persistence.Table;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
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
    private RoadAddress roadAddress;

    @Embedded
    @Getter(AccessLevel.NONE)
    private PerformanceRoles roles = new PerformanceRoles();

    public Performance(long ownerId, long posterFileId, String title, RoadAddress roadAddress) {
        this.ownerId = requirePositive(ownerId, "공연 소유자 ID는 1 이상이어야 합니다.");
        this.posterFileId = requirePositive(posterFileId, "포스터 파일 ID는 1 이상이어야 합니다.");
        this.title = requireText(title, "공연 제목은 필수입니다.");
        this.roadAddress = requireNonNull(roadAddress, "공연 도로명주소는 필수입니다.");
        registerEvent(new PerformanceCreatedEvent(ownerId, posterFileId));
    }

    public void addRole(String name, String description) {
        roles.add(this, name, description);
    }

    public List<PerformanceRole> getRoles() {
        return roles.values();
    }

    public void update(long posterFileId, String title, RoadAddress roadAddress, List<PerformanceRoleChange> roles) {
        final long changedPosterFileId = requirePositive(posterFileId, "포스터 파일 ID는 1 이상이어야 합니다.");
        final String changedTitle = requireText(title, "공연 제목은 필수입니다.");
        final RoadAddress changedRoadAddress = requireNonNull(roadAddress, "공연 도로명주소는 필수입니다.");
        this.roles.replace(this, requireNonNull(roles, "공연 배역 목록은 필수입니다."));

        final long previousPosterFileId = this.posterFileId;
        this.posterFileId = changedPosterFileId;
        this.title = changedTitle;
        this.roadAddress = changedRoadAddress;
        if (previousPosterFileId != changedPosterFileId) {
            registerEvent(new PerformancePosterChangedEvent(ownerId, previousPosterFileId, changedPosterFileId));
        }
    }
}
