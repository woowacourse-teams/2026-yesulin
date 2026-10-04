package art.yesulin.domain.timetable.setting;

import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableWindows {

    public static final int MAX_SIZE = 200;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "timetable_id", nullable = false)
    private List<TimetableWindow> windows = new ArrayList<>();

    public TimetableWindows(List<TimetableWindow> windows, int slotMinutes) {
        requireSizeWithinLimit(windows);
        List<TimetableWindow> sorted = windows.stream().sorted(TimetableWindow.ORDER).toList();
        sorted.forEach(window -> requireFitsSlot(window, slotMinutes));
        requireNoOverlap(sorted);
        this.windows = new ArrayList<>(sorted);
    }

    public List<TimetableWindow> values() {
        return windows.stream().sorted(TimetableWindow.ORDER).toList();
    }

    public List<TimeSlot> slots(int slotMinutes) {
        return windows.stream()
                .flatMap(window -> window.slots(slotMinutes).stream())
                .sorted()
                .toList();
    }

    public void replaceWith(TimetableWindows next) {
        windows.removeIf(window -> !next.windows.contains(window));
        next.windows.stream()
                .filter(window -> !windows.contains(window))
                .forEach(windows::add);
    }

    private static void requireSizeWithinLimit(List<TimetableWindow> windows) {
        if (windows == null || windows.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "오디션을 열 날짜와 시간대를 하나 이상 정해 주세요.");
        }
        if (windows.size() > MAX_SIZE) {
            throw new BusinessException(INVALID_INPUT, "시간대는 %d개까지 정할 수 있습니다.", MAX_SIZE);
        }
    }

    private static void requireFitsSlot(TimetableWindow window, int slotMinutes) {
        if (window.lengthMinutes() < slotMinutes) {
            throw new BusinessException(INVALID_INPUT, "%s %s 시간대가 1인당 소요 시간(%d분)보다 짧습니다.",
                    window.getDate(), window.getStartTime(), slotMinutes);
        }
    }

    private static void requireNoOverlap(List<TimetableWindow> sorted) {
        for (int index = 1; index < sorted.size(); index++) {
            if (sorted.get(index - 1).overlaps(sorted.get(index))) {
                throw new BusinessException(INVALID_INPUT, "%s에 서로 겹치는 시간대가 있습니다.",
                        sorted.get(index).getDate());
            }
        }
    }
}
