package art.yesulin.domain.timetable;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;

/**
 * 배우 한 명(또는 정원만큼)을 배정하는 시간 칸의 시작 시점이다. 길이는 일정표의 1인당 소요 시간을 따른다.
 * 날짜와 시각은 한국 시간 기준으로 저장하고 비교한다.
 */
public record TimeSlot(LocalDate date, LocalTime startTime) implements Comparable<TimeSlot> {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private static final DateTimeFormatter LABEL_FORMAT = DateTimeFormatter.ofPattern("M월 d일 HH:mm");
    private static final Comparator<TimeSlot> ORDER = Comparator.comparing(TimeSlot::date)
            .thenComparing(TimeSlot::startTime);

    public TimeSlot {
        requireNonNull(date, "시간 칸의 날짜는 필수입니다.");
        requireNonNull(startTime, "시간 칸의 시작 시각은 필수입니다.");
    }

    public LocalDateTime startsAt() {
        return date.atTime(startTime);
    }

    /** 오류 문구에 쓰는 사람이 읽는 표기. 예: 10월 10일 14:00 */
    public String label() {
        return startsAt().format(LABEL_FORMAT);
    }

    @Override
    public int compareTo(TimeSlot other) {
        return ORDER.compare(this, other);
    }
}
