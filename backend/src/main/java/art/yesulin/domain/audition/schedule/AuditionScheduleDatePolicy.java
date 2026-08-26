package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_SCHEDULE;

import art.yesulin.common.exception.BusinessException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

final class AuditionScheduleDatePolicy {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Seoul");

    private AuditionScheduleDatePolicy() {
    }

    static void validateStagesAfterRecruitment(RecruitmentPeriod recruitmentPeriod, List<LocalDate> stageDates) {
        LocalDate recruitmentEndDate = recruitmentPeriod.getEndAt().atZone(BUSINESS_ZONE).toLocalDate();
        if (!stageDates.getFirst().isAfter(recruitmentEndDate)) {
            throw new BusinessException(INVALID_SCHEDULE, "1차 전형일은 모집 마감 다음 날부터 설정할 수 있습니다.");
        }
    }

    static void validateStagesWithinPerformance(LocalDate performanceEndDate, List<LocalDate> stageDates) {
        if (performanceEndDate != null && stageDates.stream().anyMatch(date -> date.isAfter(performanceEndDate))) {
            throw new BusinessException(INVALID_SCHEDULE, "전형일은 공연 종료일보다 늦을 수 없습니다.");
        }
    }
}
