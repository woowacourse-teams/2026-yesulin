package art.yesulin.dormant.domain.auditionnotice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class NoticeMessageTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-09-23T00:00:00Z"), ZoneOffset.UTC);
    private final LocalDateTime appointment = LocalDateTime.of(2026, 9, 24, 14, 30);

    @Test
    void rendersAuditionInvitationWithAndWithoutAdditionalInstructions() {
        String header = "안녕하세요, 예술인 로컬 제작사입니다.\n"
                + "{이름}님께서 '호경 테스트' 오디션 대상자로 선정되셨습니다.";
        String prefix = "안녕하세요, 예술인 로컬 제작사입니다.\n"
                + "심호경님께서 '호경 테스트' 오디션 대상자로 선정되셨습니다.\n\n"
                + "오디션 일시: 2026-10-20 07:00";
        for (String instructions : new String[]{"", "\n\n장소: 대학로 OO극장\n자유연기 1분을 준비해주세요."}) {
            NoticeMessage message = NoticeMessage.create("심호경", "010-1234-5678",
                    LocalDateTime.of(2026, 10, 20, 7, 0), "오디션 일시: {오디션일시}" + instructions,
                    header, "문의: 010-1234-5678", clock);
            assertEquals(prefix + instructions + "\n\n문의: 010-1234-5678", message.body());
            assertEquals("LMS", message.type());
        }
    }

    @Test
    void rendersKoreanTimeAndNormalizesPhone() {
        NoticeMessage message = create("{이름} {오디션일시}");
        assertEquals("01012345678", message.phone());
        assertTrue(message.body().contains("하린 2026-09-24 14:30"));
        assertEquals("SMS", message.type());
    }

    @Test
    void classifiesAfterRenderingAndRejectsOversizeOrUnsupportedCharacters() {
        assertEquals("LMS", create("{이름} {오디션일시}" + "가".repeat(40)).type());
        assertThrows(IllegalArgumentException.class, () -> create("{이름} {오디션일시}" + "가".repeat(990)));
        assertThrows(IllegalArgumentException.class, () -> create("{이름} {오디션일시}😀"));
        assertThrows(IllegalArgumentException.class, () -> create("{이름} {오디션일시} {임의변수}"));
    }

    @Test
    void rejectsPastAppointmentAndMissingContact() {
        assertThrows(IllegalArgumentException.class, () -> NoticeMessage.create("하린", "미수집", appointment,
                "{이름} {오디션일시}", "회사", clock));
        assertThrows(IllegalArgumentException.class, () -> NoticeMessage.create("하린", "010-1234-5678",
                LocalDateTime.of(2026, 9, 23, 9, 0), "{이름} {오디션일시}", "회사", clock));
        assertThrows(IllegalArgumentException.class, () -> create("안녕하세요"));
    }

    private NoticeMessage create(String template) {
        return NoticeMessage.create("하린", "010-1234-5678", appointment, template, "회사 문의: 01012345678", clock);
    }
}
