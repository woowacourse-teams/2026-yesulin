package art.yesulin.domain.timetable.setting;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "timetable_windows")
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableWindow {

    public static final int MINUTE_STEP = 5;

    public static final Comparator<TimetableWindow> ORDER = Comparator.comparing(TimetableWindow::getDate)
            .thenComparing(TimetableWindow::getStartTime);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Getter(AccessLevel.NONE)
    @EqualsAndHashCode.Exclude
    private Long id;

    @Column(name = "window_date", nullable = false)
    private LocalDate date;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    public TimetableWindow(LocalDate date, LocalTime startTime, LocalTime endTime) {
        this.date = requireNonNull(date, "시간대 날짜는 필수입니다.");
        this.startTime = requireStepAligned(requireNonNull(startTime, "시간대 시작 시각은 필수입니다."));
        this.endTime = requireStepAligned(requireNonNull(endTime, "시간대 종료 시각은 필수입니다."));
        if (!startTime.isBefore(endTime)) {
            throw new BusinessException(INVALID_INPUT, "%s 시간대의 종료 시각은 시작 시각보다 늦어야 합니다.", date);
        }
    }

    public int lengthMinutes() {
        return minuteOfDay(endTime) - minuteOfDay(startTime);
    }

    public boolean overlaps(TimetableWindow other) {
        return date.equals(other.date) && startTime.isBefore(other.endTime) && other.startTime.isBefore(endTime);
    }

    public List<TimeSlot> slots(int slotMinutes) {
        List<TimeSlot> slots = new ArrayList<>();
        int end = minuteOfDay(endTime);
        for (int start = minuteOfDay(startTime); start + slotMinutes <= end; start += slotMinutes) {
            slots.add(new TimeSlot(date, LocalTime.of(start / 60, start % 60)));
        }
        return slots;
    }

    public static boolean isStepAligned(int minutes) {
        return minutes % MINUTE_STEP == 0;
    }

    private static LocalTime requireStepAligned(LocalTime time) {
        if (time.getSecond() != 0 || time.getNano() != 0 || !isStepAligned(time.getMinute())) {
            throw new BusinessException(INVALID_INPUT, "시간대는 %d분 단위로 정해 주세요.", MINUTE_STEP);
        }
        return time;
    }

    private static int minuteOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }
}
