package art.yesulin.dormant.domain.audition;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.dormant.domain.audition.AuditionErrorCode.INVALID_BASIC_INFORMATION;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PerformancePeriod {

    @Column(name = "performance_start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "performance_end_date")
    private LocalDate endDate;

    public PerformancePeriod(LocalDate startDate, LocalDate endDate) {
        this.startDate = requireNonNull(startDate, "공연 시작일은 필수입니다.");
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BusinessException(INVALID_BASIC_INFORMATION, "종료일이 시작일보다 빠릅니다.");
        }
        this.endDate = endDate;
    }

    public boolean isOpenRun() {
        return endDate == null;
    }
}
