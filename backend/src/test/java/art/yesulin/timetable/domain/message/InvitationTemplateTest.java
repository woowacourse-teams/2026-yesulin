package art.yesulin.timetable.domain.message;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

class InvitationTemplateTest {

    private static final InvitationValues VALUES = new InvitationValues(
            "김배우", "햄릿", "남극장", "10월 10일 (토) 10:00~10:30", "남극장 연습실", "대본 지참"
    );

    @Test
    void usesDefaultTextWhenBlankOrSameAsDefault() {
        InvitationTemplate blank = new InvitationTemplate("  ");

        assertFalse(blank.isCustom());
        assertEquals("""
                지원자 김배우님, 안녕하세요.
                남극장 오디션에 합격하셨습니다.
                아래 링크에서 '햄릿' 오디션 일정을 확인해 주세요.""", blank.render(VALUES));
        assertFalse(new InvitationTemplate(InvitationTemplate.DEFAULT_TEXT).isCustom());
    }

    @Test
    void fillsEveryPlaceholderAndLeavesUnknownOnes() {
        InvitationTemplate template = new InvitationTemplate("{이름} {작품명} {단체명} {오디션일시} {장소} {안내사항} {없는값}");

        assertTrue(template.isCustom());
        assertEquals("김배우 햄릿 남극장 10월 10일 (토) 10:00~10:30 남극장 연습실 대본 지참 {없는값}", template.render(VALUES));
    }

    @Test
    void rejectsTooLongText() {
        assertThrows(BusinessException.class,
                () -> new InvitationTemplate("가".repeat(InvitationTemplate.MAX_LENGTH + 1)));
    }
}
