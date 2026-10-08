package art.yesulin.timetable.domain.setting;

import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;
import static art.yesulin.timetable.domain.TimetableErrorCode.SETTING_NOT_EXTENDABLE;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;
import java.util.HashSet;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableSetting {

    public static final int MAX_SLOT_MINUTES = 240;
    public static final int MAX_SLOT_CAPACITY = 50;

    @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes;

    @Column(name = "slot_capacity", nullable = false)
    private int slotCapacity;

    @Embedded
    private TimetableWindows windows;

    public TimetableSetting(int slotMinutes, int slotCapacity, List<TimetableWindow> windows) {
        this.slotMinutes = requireSlotMinutes(slotMinutes);
        this.slotCapacity = requireSlotCapacity(slotCapacity);
        this.windows = new TimetableWindows(windows, slotMinutes);
    }

    public List<TimeSlot> slots() {
        return windows.slots(slotMinutes);
    }

    public void extendTo(TimetableSetting next) {
        requireSameSlotMinutes(next);
        requireCapacityNotReduced(next);
        requireKeepsSavedSlots(next);
        this.slotCapacity = next.slotCapacity;
        this.windows.replaceWith(next.windows);
    }

    private void requireSameSlotMinutes(TimetableSetting next) {
        if (next.slotMinutes != slotMinutes) {
            throw new BusinessException(SETTING_NOT_EXTENDABLE, "오디션 진행 시간은 바꿀 수 없습니다.");
        }
    }

    private void requireCapacityNotReduced(TimetableSetting next) {
        if (next.slotCapacity < slotCapacity) {
            throw new BusinessException(SETTING_NOT_EXTENDABLE, "동시 오디션 인원은 줄일 수 없습니다.");
        }
    }

    private void requireKeepsSavedSlots(TimetableSetting next) {
        if (!new HashSet<>(next.slots()).containsAll(slots())) {
            throw new BusinessException(SETTING_NOT_EXTENDABLE, "저장한 시간대는 줄이거나 바꿀 수 없고 늘리기만 할 수 있습니다.");
        }
    }

    private static int requireSlotMinutes(int slotMinutes) {
        if (outOf(slotMinutes, TimetableWindow.MINUTE_STEP, MAX_SLOT_MINUTES)
                || !TimetableWindow.isStepAligned(slotMinutes)) {
            throw new BusinessException(INVALID_INPUT, "1인당 소요 시간은 %d분 단위로 %d분 이하여야 합니다.",
                    TimetableWindow.MINUTE_STEP, MAX_SLOT_MINUTES);
        }
        return slotMinutes;
    }

    private static int requireSlotCapacity(int slotCapacity) {
        if (outOf(slotCapacity, 1, MAX_SLOT_CAPACITY)) {
            throw new BusinessException(INVALID_INPUT, "한 칸의 정원은 1명 이상 %d명 이하여야 합니다.", MAX_SLOT_CAPACITY);
        }
        return slotCapacity;
    }

    private static boolean outOf(int value, int min, int max) {
        return min > value || value > max;
    }
}
