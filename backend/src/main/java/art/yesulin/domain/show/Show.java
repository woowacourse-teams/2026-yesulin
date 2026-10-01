package art.yesulin.domain.show;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.show.ShowErrorCode.INVALID_INPUT;
import static art.yesulin.domain.show.ShowErrorCode.INVALID_STATUS;
import static art.yesulin.domain.show.ShowErrorCode.NOT_OPEN;
import static art.yesulin.domain.show.ShowErrorCode.NOT_OPENABLE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.performance.PerformanceVenue;
import art.yesulin.domain.show.converter.ShowGenreConverter;
import art.yesulin.domain.show.converter.ShowStatusConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 기획사/제작사가 등록하는 무료 공연이다. 오디션용 {@code Performance}와는 연결하지 않고 장소 값 객체만 재사용한다.
 * 기획사의 정보 수정과 운영자의 주최 이름 수정이 거의 동시에 저장돼도 서로 읽은 시점의 다른 값을 덮어쓰지 않도록
 * 바뀐 컬럼만 갱신한다.
 */
@Entity
@DynamicUpdate
@Table(name = "shows", uniqueConstraints = {
        @UniqueConstraint(name = "uk_shows_public_id", columnNames = "public_id")
}, indexes = {
        @Index(name = "idx_shows_status_created", columnList = "status, created_at"),
        @Index(name = "idx_shows_owner_created", columnList = "owner_id, created_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Show {

    public static final int MAX_IMAGE_COUNT = 3;
    public static final int MAX_LINK_COUNT = 3;
    public static final int MAX_GUIDE_COUNT = 5;
    public static final int MAX_HOST_NAME_LENGTH = 50;
    private static final int MAX_TITLE_LENGTH = 200;
    private static final int MAX_DESCRIPTION_LENGTH = 2000;
    private static final int MAX_AGE_RATING_LENGTH = 50;
    private static final int MAX_RUNNING_MINUTES = 1440;
    private static final String INQUIRY_PHONE_PATTERN = "\\d{2,4}-\\d{3,4}(-\\d{4})?";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    private UUID publicId;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Convert(converter = ShowGenreConverter.class)
    @Column(nullable = false, length = 20)
    private ShowGenre genre;

    @Column(nullable = false, length = MAX_DESCRIPTION_LENGTH)
    private String description;

    @Embedded
    private PerformanceVenue venue;

    @Column(name = "running_minutes", nullable = false)
    private int runningMinutes;

    @Column(name = "age_rating", nullable = false, length = MAX_AGE_RATING_LENGTH)
    private String ageRating;

    @Column(name = "inquiry_phone", nullable = false, length = 13)
    private String inquiryPhone;

    @Column(name = "poster_file_id", nullable = false)
    private long posterFileId;

    @Getter(AccessLevel.NONE)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "show_images", joinColumns = @JoinColumn(name = "show_id"))
    @OrderColumn(name = "image_order")
    @Column(name = "file_id", nullable = false)
    private List<Long> imageFileIds = new ArrayList<>();

    @Getter(AccessLevel.NONE)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "show_links", joinColumns = @JoinColumn(name = "show_id"))
    @OrderColumn(name = "link_order")
    private List<ShowLink> links = new ArrayList<>();

    @Getter(AccessLevel.NONE)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "show_guides", joinColumns = @JoinColumn(name = "show_id"))
    @OrderColumn(name = "guide_order")
    private List<ShowGuide> guides = new ArrayList<>();

    /** 관객에게 보여 줄 주최 이름. 비어 있으면 기획사 계정의 회사명을 쓴다. */
    @Column(name = "host_name", nullable = false, length = MAX_HOST_NAME_LENGTH)
    private String hostName = "";

    /** 관객에게 회차별 잔여석 숫자를 보여 줄지. 예매 가능 여부와 매진 표시에는 영향을 주지 않는다. */
    @Column(name = "remaining_seats_visible", nullable = false)
    private boolean remainingSeatsVisible = true;

    @Convert(converter = ShowStatusConverter.class)
    @Column(nullable = false, length = 20)
    private ShowStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Show(
            long ownerId,
            String title,
            ShowGenre genre,
            String description,
            PerformanceVenue venue,
            int runningMinutes,
            String ageRating,
            String inquiryPhone,
            long posterFileId,
            List<Long> imageFileIds
    ) {
        this.publicId = UUID.randomUUID();
        this.ownerId = requirePositive(ownerId, "공연 소유자 ID는 1 이상이어야 합니다.");
        this.status = ShowStatus.DRAFT;
        update(title, genre, description, venue, runningMinutes, ageRating, inquiryPhone, posterFileId, imageFileIds);
    }

    public void update(
            String title,
            ShowGenre genre,
            String description,
            PerformanceVenue venue,
            int runningMinutes,
            String ageRating,
            String inquiryPhone,
            long posterFileId,
            List<Long> imageFileIds
    ) {
        this.title = requireMaxLength(requireText(title, "공연명은 필수입니다."), MAX_TITLE_LENGTH, "공연명");
        this.genre = requireNonNull(genre, "공연 장르는 필수입니다.");
        this.description = requireMaxLength(normalizeOptional(description), MAX_DESCRIPTION_LENGTH, "공연 소개");
        this.venue = requireNonNull(venue, "공연 장소는 필수입니다.");
        this.runningMinutes = requireRunningMinutes(runningMinutes);
        this.ageRating = requireMaxLength(normalizeOptional(ageRating), MAX_AGE_RATING_LENGTH, "관람 연령");
        this.inquiryPhone = requireInquiryPhone(inquiryPhone);
        this.posterFileId = requirePositive(posterFileId, "포스터 파일 ID는 1 이상이어야 합니다.");
        this.imageFileIds = new ArrayList<>(requireImageFileIds(imageFileIds));
    }

    /**
     * 관객 화면의 주최 이름, 예매 안내 링크, 추가 안내, 잔여석 공개 여부를 바꾼다.
     * 새 공연의 기본값은 계정 회사명으로 주최 표시, 링크·안내 없음, 잔여석 공개다.
     */
    public void updateAudienceGuide(
            String hostName, List<ShowLink> links, List<ShowGuide> guides, boolean remainingSeatsVisible
    ) {
        updateHostName(hostName);
        this.links = new ArrayList<>(requireLinks(links));
        this.guides = new ArrayList<>(requireGuides(guides));
        this.remainingSeatsVisible = remainingSeatsVisible;
    }

    /** 관객에게 보여 줄 주최 이름만 바꾼다. 빈 값이면 기획사 계정의 회사명을 쓴다. 운영자 수정에도 쓴다. */
    public void updateHostName(String hostName) {
        this.hostName = requireMaxLength(normalizeOptional(hostName), MAX_HOST_NAME_LENGTH, "주최 이름");
    }

    /** 공연에 따로 적은 주최 이름이 없으면 기획사 계정의 회사명을 쓴다. */
    public String hostNameOr(String defaultHostName) {
        return hostName.isEmpty() ? defaultHostName : hostName;
    }

    /**
     * 예매 가능한 회차가 하나 이상 있어야 공개한다. 이미 예매 중이면 현재 상태를 유지한다.
     */
    public void open(Instant now, List<ShowSession> sessions) {
        if (status == ShowStatus.OPEN) {
            return;
        }
        boolean hasBookableSession = requireNonNull(sessions, "공연 회차 목록은 필수입니다.").stream()
                .anyMatch(session -> session.belongsTo(id) && session.isBookableAt(now));
        if (!hasBookableSession) {
            throw new BusinessException(NOT_OPENABLE, "예매 가능한 회차가 있어야 공연을 공개할 수 있습니다.");
        }
        this.status = ShowStatus.OPEN;
    }

    public void close() {
        if (status == ShowStatus.CLOSED) {
            return;
        }
        if (status != ShowStatus.OPEN) {
            throw new BusinessException(INVALID_STATUS, "예매 중인 공연만 마감할 수 있습니다.");
        }
        this.status = ShowStatus.CLOSED;
    }

    public void ensureOpen() {
        if (status != ShowStatus.OPEN) {
            throw new BusinessException(NOT_OPEN, "예매 중인 공연이 아닙니다.");
        }
    }

    public boolean isPublic() {
        return status != ShowStatus.DRAFT;
    }

    public List<Long> getImageFileIds() {
        return List.copyOf(imageFileIds);
    }

    public List<ShowLink> getLinks() {
        return List.copyOf(links);
    }

    public List<ShowGuide> getGuides() {
        return List.copyOf(guides);
    }

    private static int requireRunningMinutes(int runningMinutes) {
        if (runningMinutes < 1 || runningMinutes > MAX_RUNNING_MINUTES) {
            throw new BusinessException(INVALID_INPUT, "공연 시간은 1분 이상 1440분 이하로 입력해 주세요.");
        }
        return runningMinutes;
    }

    private static String requireInquiryPhone(String inquiryPhone) {
        String normalized = requireText(inquiryPhone, "문의 전화번호는 필수입니다.");
        if (!normalized.matches(INQUIRY_PHONE_PATTERN)) {
            throw new BusinessException(INVALID_INPUT, "문의 전화번호는 02-123-4567 형식으로 입력해 주세요.");
        }
        return normalized;
    }

    private static List<Long> requireImageFileIds(List<Long> imageFileIds) {
        List<Long> values = imageFileIds == null ? List.of() : imageFileIds;
        if (values.size() > MAX_IMAGE_COUNT || values.stream().anyMatch(fileId -> fileId == null || fileId <= 0)
                || new HashSet<>(values).size() != values.size()) {
            throw new BusinessException(INVALID_INPUT, "서로 다른 상세 이미지를 최대 3장까지 등록해 주세요.");
        }
        return values;
    }

    private static List<ShowLink> requireLinks(List<ShowLink> links) {
        List<ShowLink> values = links == null ? List.of() : links;
        if (values.size() > MAX_LINK_COUNT || values.stream().anyMatch(link -> link == null)) {
            throw new BusinessException(INVALID_INPUT, "안내 링크는 최대 %d개까지 등록할 수 있습니다.", MAX_LINK_COUNT);
        }
        return values;
    }

    private static List<ShowGuide> requireGuides(List<ShowGuide> guides) {
        List<ShowGuide> values = guides == null ? List.of() : guides;
        if (values.size() > MAX_GUIDE_COUNT || values.stream().anyMatch(guide -> guide == null)) {
            throw new BusinessException(INVALID_INPUT, "추가 안내는 최대 %d개까지 등록할 수 있습니다.", MAX_GUIDE_COUNT);
        }
        return values;
    }

    private static String requireMaxLength(String value, int maxLength, String fieldName) {
        if (value.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, "%s은(는) %d자를 넘을 수 없습니다.", fieldName, maxLength);
        }
        return value;
    }

    private static String normalizeOptional(String value) {
        return value == null ? "" : value.trim();
    }
}
