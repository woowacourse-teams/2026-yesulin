package art.yesulin.application.auth.social;

import java.util.Locale;

public enum SocialProvider {
    KAKAO,
    NAVER,
    GOOGLE;

    public static SocialProvider fromRegistrationId(String registrationId) {
        if (registrationId == null || registrationId.isBlank()) {
            throw new IllegalArgumentException("Social provider registration ID is required");
        }
        try {
            return valueOf(registrationId.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported social provider", exception);
        }
    }
}
