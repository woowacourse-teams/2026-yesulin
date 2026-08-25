package art.yesulin.domain.audition;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_BASIC_INFORMATION;
import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_STATUS;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.converter.AuditionStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "auditions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_auditions_public_id", columnNames = "public_id")
}, indexes = {
        @Index(name = "idx_auditions_performance_id", columnList = "performance_id"),
        @Index(name = "idx_auditions_owner_id", columnList = "owner_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Audition {

    private static final int MAX_TITLE_LENGTH = 200;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    private UUID publicId;

    @Column(name = "performance_id", nullable = false, updatable = false)
    private long performanceId;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Getter(AccessLevel.NONE)
    @Embedded
    private PerformancePeriod performancePeriod;

    @Convert(converter = AuditionStatusConverter.class)
    @Column(nullable = false, length = 20)
    private AuditionStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    public Audition(long performanceId, long ownerId, String title, PerformancePeriod performancePeriod) {
        this(UUID.randomUUID(), performanceId, ownerId, title, performancePeriod);
    }

    public Audition(
            UUID publicId,
            long performanceId,
            long ownerId,
            String title,
            PerformancePeriod performancePeriod
    ) {
        this.publicId = requireNonNull(publicId, "공고 공개 ID는 필수입니다.");
        this.performanceId = requirePositive(performanceId, "공연 ID는 1 이상이어야 합니다.");
        this.ownerId = requirePositive(ownerId, "공고 소유자 ID는 1 이상이어야 합니다.");
        this.title = normalizeTitle(title);
        this.performancePeriod = requireNonNull(performancePeriod, "공연 날짜 정보가 필요합니다.");
        this.status = AuditionStatus.DRAFT;
    }

    public void updateBasicInformation(String title, PerformancePeriod performancePeriod) {
        this.title = normalizeTitle(title);
        this.performancePeriod = requireNonNull(performancePeriod, "공연 날짜 정보가 필요합니다.");
    }

    public void publish(Instant publicationTime) {
        if (status == AuditionStatus.PUBLISHED) {
            return;
        }
        if (status != AuditionStatus.DRAFT) {
            throw new BusinessException(INVALID_STATUS, "게시할 수 있는 상태의 공고가 아닙니다.");
        }
        Instant validPublicationTime = requireNonNull(publicationTime, "공고 게시 시각은 필수입니다.");
        this.status = AuditionStatus.PUBLISHED;
        this.publishedAt = validPublicationTime;
    }

    private String normalizeTitle(String title) {
        String normalizedTitle = requireText(title, "공고명은 비어 있을 수 없습니다.");
        if (normalizedTitle.length() > MAX_TITLE_LENGTH) {
            throw new BusinessException(INVALID_BASIC_INFORMATION, "공고명은 200자를 넘을 수 없습니다.");
        }
        return normalizedTitle;
    }

    public LocalDate getPerformanceStartDate() {
        return performancePeriod.getStartDate();
    }

    public LocalDate getPerformanceEndDate() {
        return performancePeriod.getEndDate();
    }

    public boolean isOpenRun() {
        return performancePeriod.isOpenRun();
    }

    public boolean isPublished() {
        return status != AuditionStatus.DRAFT;
    }
}
