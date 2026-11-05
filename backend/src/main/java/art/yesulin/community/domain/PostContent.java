package art.yesulin.community.domain;

import java.util.Objects;

public record PostContent(String title, String body, CommunityTopic topic) {

    public PostContent {
        topic = Objects.requireNonNullElse(topic, CommunityTopic.FREE);
    }
}
