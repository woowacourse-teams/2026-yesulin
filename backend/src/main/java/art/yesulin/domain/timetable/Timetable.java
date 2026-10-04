package art.yesulin.domain.timetable;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.timetable.TimetableErrorCode.NOT_PUBLISHABLE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.timetable.converter.TimetableStatusConverter;
import art.yesulin.domain.timetable.event.TimetableCreatedEvent;
import art.yesulin.domain.timetable.setting.TimeSlot;
import art.yesulin.domain.timetable.setting.TimetableSetting;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.springframework.data.domain.AbstractAggregateRoot;

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
public class Timetable extends AbstractAggregateRoot<Timetable> {

    /** 배우가 직접 시간을 바꾸려면 지금 시간과 옮길 시간 모두 이만큼 남아 있어야 한다. 당일 혼란을 막는다. */
    public static final Duration SELF_CHANGE_NOTICE = Duration.ofHours(24);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "manage_key", nullable = false, updatable = false))
    private TimetableKey manageKey;

    @Embedded
    private TimetableProfile profile;

    @Embedded
    private TimetableSetting setting;

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

    public Timetable(TimetableProfile profile, TimetableSetting setting) {
        this.manageKey = TimetableKey.generate();
        this.status = TimetableStatus.DRAFT;
        updateProfile(profile);
        this.setting = requireNonNull(setting, "시간 칸 설정은 필수입니다.");
    }

    public void updateProfile(TimetableProfile profile) {
        this.profile = requireNonNull(profile, "일정표 안내 정보는 필수입니다.");
    }

    public void updateSetting(TimetableSetting next) {
        setting.extendTo(requireNonNull(next, "시간 칸 설정은 필수입니다."));
    }

    public void publish(Instant now) {
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

    public List<TimeSlot> slots() {
        return setting.slots();
    }

    public LocalTime endTimeOf(TimeSlot slot) {
        return slot.startTime().plusMinutes(setting.getSlotMinutes());
    }

    public Instant startInstantOf(TimeSlot slot) {
        return slot.startsAt().atZone(TimeSlot.ZONE).toInstant();
    }

    /** 시작까지 직접 변경 마감 시간보다 많이 남은 칸인지. 마감 시각 정각까지는 바꿀 수 있다. */
    public boolean isBeforeSelfChangeDeadline(TimeSlot slot, Instant now) {
        return !now.plus(SELF_CHANGE_NOTICE).isAfter(startInstantOf(slot));
    }
    
    @PostPersist
    private void registerCreatedEvent() {
        registerEvent(new TimetableCreatedEvent(id));
    }
}
