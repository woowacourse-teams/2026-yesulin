package art.yesulin.infrastructure.slack;

import java.util.Arrays;
import java.util.List;
import org.springframework.core.env.Environment;

/** 로컬과 DEV가 같은 Slack 채널을 쓰므로 메시지 앞에 어느 환경에서 보냈는지 붙인다. */
public final class SlackEnvironment {

    private SlackEnvironment() {
    }

    public static String label(Environment environment) {
        List<String> profiles = Arrays.asList(environment.getActiveProfiles());
        if (profiles.contains("prod")) {
            return "[PROD]";
        }
        if (profiles.contains("dev")) {
            return "[DEV]";
        }
        return "[LOCAL]";
    }
}
