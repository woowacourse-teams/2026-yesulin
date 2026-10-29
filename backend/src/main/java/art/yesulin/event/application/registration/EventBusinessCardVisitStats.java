package art.yesulin.event.application.registration;

import java.time.LocalDate;
import java.util.List;

/** 이벤트에서 발급한 모든 명함의 한국 날짜별 총 접속 횟수. */
public record EventBusinessCardVisitStats(
        LocalDate fromDate, LocalDate toDate, List<Daily> daily
) {

    public record Daily(LocalDate date, long visits) {
    }
}
