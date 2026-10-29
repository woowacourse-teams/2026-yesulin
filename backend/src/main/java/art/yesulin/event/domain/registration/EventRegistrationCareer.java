package art.yesulin.event.domain.registration;

import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 배우 경력 한 줄. 언제(연월), 어떤 작품에서, 어떤 역을 했는지 적는다. 역은 비워 둘 수 있다.
 */
@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventRegistrationCareer {

    public static final int MAX_WORK_TITLE_LENGTH = 100;
    public static final int MAX_ROLE_LENGTH = 50;

    /** 공연하거나 촬영한 연월. {@code YYYY-MM}이다. */
    @Column(name = "performed_month", nullable = false, length = 7)
    private String performedMonth;

    @Column(name = "work_title", nullable = false, length = MAX_WORK_TITLE_LENGTH)
    private String workTitle;

    @Column(length = MAX_ROLE_LENGTH)
    private String role;

    public EventRegistrationCareer(String performedMonth, String workTitle, String role) {
        this.performedMonth = month(performedMonth);
        String title = workTitle == null ? "" : workTitle.strip();
        if (title.isEmpty() || title.length() > MAX_WORK_TITLE_LENGTH) {
            throw new BusinessException(
                    INVALID_INPUT, "경력의 작품명은 1~%d자로 적어 주세요.", MAX_WORK_TITLE_LENGTH
            );
        }
        this.workTitle = title;
        String normalizedRole = role == null || role.isBlank() ? null : role.strip();
        if (normalizedRole != null && normalizedRole.length() > MAX_ROLE_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "경력의 역할은 %d자 이내여야 합니다.", MAX_ROLE_LENGTH);
        }
        this.role = normalizedRole;
    }

    private static String month(String value) {
        try {
            return YearMonth.parse(value == null ? "" : value.strip()).toString();
        } catch (DateTimeParseException exception) {
            throw new BusinessException(INVALID_INPUT, "경력 시기는 연월(예: 2026-03)로 적어 주세요.");
        }
    }
}
