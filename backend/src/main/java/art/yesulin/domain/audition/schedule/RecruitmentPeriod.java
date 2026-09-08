package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_SCHEDULE;
import static art.yesulin.domain.audition.AuditionErrorCode.PUBLISHING_CLOSED;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecruitmentPeriod {

    @Column(name = "recruitment_start_at")
    private Instant startAt;

    @Column(name = "recruitment_end_at", nullable = false)
    private Instant endAt;

    public RecruitmentPeriod(Instant startAt, Instant endAt) {
        this.endAt = requireNonNull(endAt, "모집 종료 시각은 필수입니다.");
        if (startAt != null && !endAt.isAfter(startAt)) {
            throw new BusinessException(INVALID_SCHEDULE, "모집 종료 시각은 시작 시각보다 늦어야 합니다.");
        }
        if ((startAt != null && !isMinutePrecision(startAt)) || !isMinutePrecision(endAt)) {
            throw new BusinessException(INVALID_SCHEDULE, "모집 시작과 종료 시각은 분 단위로 입력해야 합니다.");
        }
        this.startAt = startAt;
    }

    void publishAt(Instant time) {
        requireNonNull(time, "공고 게시 시각은 필수입니다.");
        if (!endAt.isAfter(time)) {
            throw new BusinessException(PUBLISHING_CLOSED, "모집이 마감된 공고는 게시할 수 없습니다.");
        }
        this.startAt = time.truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
    }

    private boolean isMinutePrecision(Instant instant) {
        return instant.getEpochSecond() % 60 == 0 && instant.getNano() == 0;
    }
}
