package art.yesulin.domain.timetable;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 기획사가 일정표에 등록한 합격 배우다. 회원이 아니며 문자로 받은 개인 링크의 열쇠로 자기 일정만 본다.
 * 시간 칸은 기획사의 배정과 배우의 직접 변경으로만 바뀌고, 둘 다 일정표 행을 잠근 뒤 {@link TimetableBoard}를 거친다.
 */
@Entity
@DynamicUpdate
@Table(name = "timetable_actors", uniqueConstraints = {
        @UniqueConstraint(name = "uk_timetable_actors_access_key", columnNames = "access_key"),
        @UniqueConstraint(name = "uk_timetable_actors_phone", columnNames = {"timetable_id", "phone"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableActor {

    public static final int MAX_NAME_LENGTH = 30;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "timetable_id", nullable = false, updatable = false)
    private long timetableId;

    @Column(name = "access_key", nullable = false, updatable = false, length = TimetableKey.LENGTH)
    private String accessKey;

    @Column(nullable = false, updatable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(nullable = false, updatable = false, length = MobilePhone.LENGTH)
    private String phone;

    @Getter(AccessLevel.NONE)
    @Column(name = "slot_date")
    private LocalDate slotDate;

    @Getter(AccessLevel.NONE)
    @Column(name = "slot_start_time")
    private LocalTime slotStartTime;

    /** 합격·일정 안내 문자를 대기열에 넣은 시각. 배우 링크는 이 시각이 있어야 열린다. */
    @Column(name = "invited_at")
    private Instant invitedAt;

    /** 배우가 링크에서 직접 바꾼 시각. 기획사가 다시 옮기면 지운다. */
    @Column(name = "actor_changed_at")
    private Instant actorChangedAt;

    @Getter(AccessLevel.NONE)
    @Column(name = "previous_slot_date")
    private LocalDate previousSlotDate;

    @Getter(AccessLevel.NONE)
    @Column(name = "previous_slot_start_time")
    private LocalTime previousSlotStartTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public TimetableActor(long timetableId, String accessKey, String name, String phone) {
        if (!TimetableKey.isWellFormed(accessKey)) {
            throw new IllegalArgumentException("배우 링크 열쇠 형식이 올바르지 않습니다.");
        }
        this.timetableId = requirePositive(timetableId, "일정표 ID는 1 이상이어야 합니다.");
        this.accessKey = accessKey;
        this.name = requireName(name);
        this.phone = MobilePhone.require(phone, "‘" + this.name + "’ 배우의");
    }

    /** 배정되지 않았으면 null이다. */
    public TimeSlot getSlot() {
        return toSlot(slotDate, slotStartTime);
    }

    /** 배우가 직접 바꾸기 전의 시간. 배우가 바꾼 적이 없거나 기획사가 다시 옮겼으면 null이다. */
    public TimeSlot getPreviousSlot() {
        return toSlot(previousSlotDate, previousSlotStartTime);
    }

    public boolean isAssigned() {
        return slotDate != null;
    }

    public boolean isInvited() {
        return invitedAt != null;
    }

    public boolean isChangedByActor() {
        return actorChangedAt != null;
    }

    /** 이미 안내했다면 처음 안내 시각을 유지한다. */
    public void markInvited(Instant now) {
        if (invitedAt == null) {
            this.invitedAt = requireNonNull(now, "안내 시각은 필수입니다.");
        }
    }

    void assignByOrganizer(TimeSlot slot) {
        changeSlot(slot);
        this.actorChangedAt = null;
        this.previousSlotDate = null;
        this.previousSlotStartTime = null;
    }

    /** 배우가 여러 번 바꿔도 기획사가 마지막으로 정한 시간을 이전 시간으로 남긴다. */
    void moveByActor(TimeSlot slot, Instant now) {
        if (actorChangedAt == null) {
            this.previousSlotDate = slotDate;
            this.previousSlotStartTime = slotStartTime;
        }
        changeSlot(requireNonNull(slot, "옮길 시간은 필수입니다."));
        this.actorChangedAt = requireNonNull(now, "변경 시각은 필수입니다.");
    }

    private void changeSlot(TimeSlot slot) {
        this.slotDate = slot == null ? null : slot.date();
        this.slotStartTime = slot == null ? null : slot.startTime();
    }

    private static TimeSlot toSlot(LocalDate date, LocalTime startTime) {
        return date == null || startTime == null ? null : new TimeSlot(date, startTime);
    }

    private static String requireName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "배우 이름을 입력해 주세요.");
        }
        if (normalized.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "배우 이름은 %d자를 넘을 수 없습니다.", MAX_NAME_LENGTH);
        }
        return normalized;
    }
}
