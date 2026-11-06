package art.yesulin.feedback.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FeedbackTest {

    private static final Instant NOW = Instant.parse("2026-11-05T10:00:00Z");
    private static final FeedbackPage PAGE = new FeedbackPage("/community", "Mozilla/5.0");

    @Test
    @DisplayName("내용의 앞뒤 공백과 줄바꿈을 정리하고 연락처는 선택이다")
    void normalizesContentAndKeepsContactOptional() {
        Feedback feedback = new Feedback(FeedbackType.BUG, "  저장이 안 돼요\r\n두 번째 줄  ", " ", PAGE, null, NOW);

        assertEquals("저장이 안 돼요\n두 번째 줄", feedback.getContent());
        assertEquals("", feedback.getContact());
        assertFalse(feedback.hasContact());
    }

    @Test
    @DisplayName("연락처를 남기면 남긴 것으로 본다")
    void marksContactWhenLeft() {
        Feedback feedback = new Feedback(FeedbackType.SUGGESTION, "제안", "  test@example.com ", PAGE, 3L, NOW);

        assertEquals("test@example.com", feedback.getContact());
        assertTrue(feedback.hasContact());
    }

    @Test
    @DisplayName("빈 내용과 너무 긴 내용은 받지 않는다")
    void rejectsBlankAndTooLongContent() {
        assertThrows(IllegalArgumentException.class,
                () -> new Feedback(FeedbackType.BUG, "   ", "", PAGE, null, NOW));
        assertThrows(IllegalArgumentException.class,
                () -> new Feedback(FeedbackType.BUG, "가".repeat(Feedback.CONTENT_MAX + 1), "", PAGE, null, NOW));
    }

    @Test
    @DisplayName("화면 경로는 쿼리와 해시를 버리고 이상한 값은 비운다")
    void keepsOnlySafePagePath() {
        assertEquals("/posts/12", new FeedbackPage("/posts/12?src=kakao&phone=010#c", "").path());
        assertEquals("", new FeedbackPage("https://evil.example/x", "").path());
        assertEquals("", new FeedbackPage("//evil.example/x", "").path());
        assertEquals("", new FeedbackPage(null, null).path());
    }

    @Test
    @DisplayName("알림 문구를 바꿀 수 있는 문자가 섞인 경로는 비운다")
    void dropsPathWithControlCharacters() {
        assertEquals("", new FeedbackPage("/a\n보낸 사람: 운영자", "").path());
        assertEquals("", new FeedbackPage("/<!channel>", "").path());
        assertEquals("", new FeedbackPage("/a b", "").path());
        assertEquals("/community/12", new FeedbackPage("/community/12", "").path());
    }

    @Test
    @DisplayName("경로와 브라우저 정보는 길이를 넘으면 자른다")
    void truncatesLongPathAndUserAgent() {
        FeedbackPage page = new FeedbackPage("/" + "a".repeat(400), "b".repeat(400));

        assertEquals(Feedback.PAGE_PATH_MAX, page.path().length());
        assertEquals(Feedback.USER_AGENT_MAX, page.userAgent().length());
    }
}
