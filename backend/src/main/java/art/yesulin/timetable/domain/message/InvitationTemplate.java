package art.yesulin.timetable.domain.message;

import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InvitationTemplate {

    public static final int MAX_LENGTH = 1000;
    public static final String DEFAULT_TEXT = """
            지원자 {이름}님, 안녕하세요.
            {단체명} 오디션에 합격하셨습니다.
            아래 링크에서 '{작품명}' 오디션 일정을 확인해 주세요.""";

    @Column(name = "invitation_template", nullable = false, length = MAX_LENGTH)
    private String text;

    public InvitationTemplate(String text) {
        String normalized = text == null ? "" : text.strip();
        if (normalized.length() > MAX_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "합격 문자 문구는 %d자를 넘을 수 없습니다.", MAX_LENGTH);
        }
        this.text = normalized.equals(DEFAULT_TEXT) ? "" : normalized;
    }

    public static InvitationTemplate defaultTemplate() {
        return new InvitationTemplate("");
    }

    public boolean isCustom() {
        return !text.isEmpty();
    }

    public String getText() {
        return isCustom() ? text : DEFAULT_TEXT;
    }

    public String render(InvitationValues values) {
        return getText()
                .replace("{이름}", values.actorName())
                .replace("{작품명}", values.title())
                .replace("{단체명}", values.organizerName())
                .replace("{오디션일시}", values.schedule())
                .replace("{장소}", values.location())
                .replace("{안내사항}", values.guide());
    }
}
