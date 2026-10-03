package art.yesulin.domain.timetable;

import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import java.util.List;

/**
 * 시간 칸을 만드는 규칙이다. 1인당 소요 시간마다 칸을 나누고, 한 칸에는 정원만큼 배우를 배정한다.
 * 시간대는 날짜·시작 시각 순으로 정렬해 보관하며 같은 날 서로 겹칠 수 없다. 맞닿는 것은 허용한다.
 */
public record TimetableSetting(int slotMinutes, int slotCapacity, List<TimetableWindow> windows) {

    public static final int MAX_SLOT_MINUTES = 240;
    public static final int MAX_SLOT_CAPACITY = 50;
    public static final int MAX_WINDOWS = 200;

    public TimetableSetting {
        if (slotMinutes < TimetableWindow.MINUTE_STEP || slotMinutes > MAX_SLOT_MINUTES
                || slotMinutes % TimetableWindow.MINUTE_STEP != 0) {
            throw new BusinessException(INVALID_INPUT, "1인당 소요 시간은 %d분 단위로 %d분 이하여야 합니다.",
                    TimetableWindow.MINUTE_STEP, MAX_SLOT_MINUTES);
        }
        if (slotCapacity < 1 || slotCapacity > MAX_SLOT_CAPACITY) {
            throw new BusinessException(INVALID_INPUT, "한 칸의 정원은 1명 이상 %d명 이하여야 합니다.", MAX_SLOT_CAPACITY);
        }
        windows = sorted(windows, slotMinutes);
    }

    private static List<TimetableWindow> sorted(List<TimetableWindow> windows, int slotMinutes) {
        if (windows == null || windows.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "오디션을 열 날짜와 시간대를 하나 이상 정해 주세요.");
        }
        if (windows.size() > MAX_WINDOWS) {
            throw new BusinessException(INVALID_INPUT, "시간대는 %d개까지 정할 수 있습니다.", MAX_WINDOWS);
        }
        List<TimetableWindow> sorted = windows.stream().sorted(TimetableWindow.ORDER).toList();
        for (int index = 0; index < sorted.size(); index++) {
            TimetableWindow window = sorted.get(index);
            if (window.lengthMinutes() < slotMinutes) {
                throw new BusinessException(INVALID_INPUT, "%s %s 시간대가 1인당 소요 시간(%d분)보다 짧습니다.",
                        window.getDate(), window.getStartTime(), slotMinutes);
            }
            if (index > 0 && sorted.get(index - 1).overlaps(window)) {
                throw new BusinessException(INVALID_INPUT, "%s에 서로 겹치는 시간대가 있습니다.", window.getDate());
            }
        }
        return sorted;
    }
}
