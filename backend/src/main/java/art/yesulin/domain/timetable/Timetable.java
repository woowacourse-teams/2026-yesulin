package art.yesulin.domain.timetable;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.timetable.TimetableErrorCode.NOT_PUBLISHABLE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.timetable.converter.TimetableStatusConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 기획사가 합격 배우의 오디션 시간을 정하는 일정표다. 로그인 없이 관리 링크의 열쇠로만 접근한다.
 * 배우 배정과 정원 검사는 이 행을 잠근 application service가 {@link TimetableBoard}로 한다.
 */
@Entity
@DynamicUpdate
@Table(name = "timetables", uniqueConstraints = {
        @UniqueConstraint(name = "uk_timetables_manage_key", columnNames = "manage_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Timetable {

    /** 배우가 직접 시간을 바꾸려면 지금 시간과 옮길 시간 모두 이만큼 남아 있어야 한다. 당일 혼란을 막는다. */
    public static final Duration SELF_CHANGE_NOTICE = Duration.ofHours(24);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "manage_key", nullable = false, updatable = false, length = TimetableKey.LENGTH)
    private String manageKey;

    @Column(nullable = false, length = TimetableProfile.MAX_TITLE_LENGTH)
    private String title;

    @Column(name = "organizer_name", nullable = false, length = TimetableProfile.MAX_ORGANIZER_NAME_LENGTH)
    private String organizerName;

    @Column(name = "organizer_phone", nullable = false, length = MobilePhone.LENGTH)
    private String organizerPhone;

    @Column(nullable = false, length = TimetableProfile.MAX_LOCATION_LENGTH)
    private String location;

    @Column(nullable = false, length = TimetableProfile.MAX_GUIDE_LENGTH)
    private String guide;

    @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes;

    @Column(name = "slot_capacity", nullable = false)
    private int slotCapacity;

    @Convert(converter = TimetableStatusConverter.class)
    @Column(nullable = false, length = 20)
    private TimetableStatus status;

    @Column(name = "self_change_locked", nullable = false)
    private boolean selfChangeLocked;

    @Column(name = "published_at")
    private Instant publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Getter(AccessLevel.NONE)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "timetable_windows", joinColumns = @JoinColumn(name = "timetable_id"))
    @OrderColumn(name = "window_order")
    private List<TimetableWindow> windows = new ArrayList<>();

    public Timetable(String manageKey, TimetableProfile profile, TimetableSetting setting) {
        if (!TimetableKey.isWellFormed(manageKey)) {
            throw new IllegalArgumentException("관리 링크 열쇠 형식이 올바르지 않습니다.");
        }
        this.manageKey = manageKey;
        this.status = TimetableStatus.DRAFT;
        updateProfile(profile);
        updateSetting(setting);
    }

    public void updateProfile(TimetableProfile profile) {
        requireNonNull(profile, "일정표 안내 정보는 필수입니다.");
        this.title = profile.title();
        this.organizerName = profile.organizerName();
        this.organizerPhone = profile.organizerPhone();
        this.location = profile.location();
        this.guide = profile.guide();
    }

    /** 배정이 새 규칙에 맞는지는 같은 트랜잭션에서 {@link TimetableBoard#ensureValid()}가 확인한다. */
    public void updateSetting(TimetableSetting setting) {
        requireNonNull(setting, "시간 칸 설정은 필수입니다.");
        this.slotMinutes = setting.slotMinutes();
        this.slotCapacity = setting.slotCapacity();
        this.windows.clear();
        this.windows.addAll(setting.windows());
    }

    void publish(Instant now) {
        if (isPublished()) {
            throw new BusinessException(NOT_PUBLISHABLE, "이미 확정한 일정표입니다.");
        }
        this.status = TimetableStatus.PUBLISHED;
        this.publishedAt = requireNonNull(now, "확정 시각은 필수입니다.");
    }

    public void changeSelfChangeLock(boolean locked) {
        this.selfChangeLocked = locked;
    }

    public boolean isPublished() {
        return status == TimetableStatus.PUBLISHED;
    }

    public List<TimetableWindow> getWindows() {
        return List.copyOf(windows);
    }

    /** 바운더리 안의 모든 시간 칸을 시간순으로 돌려준다. */
    public List<TimeSlot> slots() {
        return windows.stream()
                .flatMap(window -> window.slots(slotMinutes).stream())
                .sorted()
                .toList();
    }

    public LocalTime endTimeOf(TimeSlot slot) {
        return slot.startTime().plusMinutes(slotMinutes);
    }

    public Instant startInstantOf(TimeSlot slot) {
        return slot.startsAt().atZone(TimeSlot.ZONE).toInstant();
    }

    /** 시작까지 직접 변경 마감 시간보다 많이 남은 칸인지. 마감 시각 정각까지는 바꿀 수 있다. */
    boolean isBeforeSelfChangeDeadline(TimeSlot slot, Instant now) {
        return !now.plus(SELF_CHANGE_NOTICE).isAfter(startInstantOf(slot));
    }
}
