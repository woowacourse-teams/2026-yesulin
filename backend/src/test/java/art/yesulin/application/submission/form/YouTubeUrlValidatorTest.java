package art.yesulin.application.submission.form;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class YouTubeUrlValidatorTest {

    private final YouTubeUrlValidator validator = new YouTubeUrlValidator();

    @Test
    void acceptsSupportedYoutubeVideoUrls() {
        List<String> supportedUrls = List.of(
                "https://youtu.be/abcdefghijk",
                "https://www.youtube.com/watch?v=abcdefghijk",
                "https://m.youtube.com/shorts/abcdefghijk",
                "http://youtube.com/embed/abcdefghijk"
        );

        supportedUrls.forEach(url -> assertTrue(validator.isValid(url)));
    }

    @Test
    void rejectsYoutubePageAndInvalidVideoId() {
        List<String> invalidUrls = List.of(
                "https://youtube.com/",
                "https://youtube.com/channel/abcdefghijk",
                "https://foo.youtube.com/watch?v=abcdefghijk",
                "https://youtube.com/watch?v=short",
                "https://youtu.be/abcdefghijk/extra",
                "https://example.com/watch?v=abcdefghijk",
                "javascript:alert(1)"
        );

        invalidUrls.forEach(url -> assertFalse(validator.isValid(url)));
    }
}
