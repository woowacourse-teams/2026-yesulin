package art.yesulin.auditionpost.presentation.api.producer;

import art.yesulin.auditionpost.application.ProducerAuditionPostResult;
import java.util.List;

public record ProducerAuditionPostsResponse(List<ProducerAuditionPostResult> posts) {
}
