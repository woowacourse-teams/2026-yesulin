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

    /**
     * 수정 요청에 담긴 값으로 다시 세우되 이미 정해진 모집 시작 시각은 지킨다.
     * 시작 시각은 게시할 때 서버가 정하는 값이라 수정 요청에는 실려 오지 않으므로,
     * 그대로 갈아끼우면 게시된 공고의 모집 시작 시각이 지워진다.
     * 분 단위 검사는 사람이 입력한 값을 보는 규칙이라 이미 저장된 시작 시각에는 다시 적용하지 않는다.
     */
    RecruitmentPeriod replaceKeepingStart(RecruitmentPeriod requested) {
        requireNonNull(requested, "모집 기간 정보는 필수입니다.");
        if (requested.startAt != null || startAt == null) {
            return requested;
        }
        if (!requested.endAt.isAfter(startAt)) {
            throw new BusinessException(INVALID_SCHEDULE, "모집 종료 시각은 시작 시각보다 늦어야 합니다.");
        }
        RecruitmentPeriod kept = new RecruitmentPeriod();
        kept.startAt = startAt;
        kept.endAt = requested.endAt;
        return kept;
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
