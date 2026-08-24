package art.yesulin.application.submission.form;

import art.yesulin.domain.video.YouTubeVideoUrl;
import org.springframework.stereotype.Component;

@Component
class YouTubeUrlValidator {

    boolean isValid(String value) {
        return YouTubeVideoUrl.parse(value).isPresent();
    }
}
