package art.yesulin.domain.audition.schedule;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_SCHEDULE;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;
import java.time.LocalDate;

public record ScreeningStagePlan(Long stageId, String name, LocalDate date, String notice) {

    static final int MAX_NAME_LENGTH = 100;
    static final int MAX_NOTICE_LENGTH = 100;

    public ScreeningStagePlan {
        if (stageId != null && stageId < 1) {
            throw new BusinessException(INVALID_SCHEDULE, "전형 ID는 1 이상이어야 합니다.");
        }
        name = requireText(name, "전형 이름은 필수입니다.");
        date = requireNonNull(date, "전형 날짜는 필수입니다.");
        notice = notice == null ? "" : notice.trim();
        if (name.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(INVALID_SCHEDULE, "전형 이름은 100자를 넘을 수 없습니다.");
        }
        if (notice.length() > MAX_NOTICE_LENGTH) {
            throw new BusinessException(INVALID_SCHEDULE, "전형 안내는 100자를 넘을 수 없습니다.");
        }
    }
}
