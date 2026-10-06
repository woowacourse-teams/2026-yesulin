package art.yesulin.legacy.application.submission.form;

import art.yesulin.legacy.domain.video.YouTubeVideoUrl;
import org.springframework.stereotype.Component;

@Component
class YouTubeUrlValidator {

    boolean isValid(String value) {
        return YouTubeVideoUrl.parse(value).isPresent();
    }
}
