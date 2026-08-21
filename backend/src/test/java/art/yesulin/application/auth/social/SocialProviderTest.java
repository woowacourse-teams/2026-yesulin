package art.yesulin.application.auth.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class SocialProviderTest {

    @Test
    void resolvesProviderFromSpringRegistrationId() {
        assertThat(SocialProvider.fromRegistrationId("kakao")).isEqualTo(SocialProvider.KAKAO);
        assertThat(SocialProvider.fromRegistrationId("NAVER")).isEqualTo(SocialProvider.NAVER);
    }

    @Test
    void rejectsUnsupportedRegistrationId() {
        assertThatThrownBy(() -> SocialProvider.fromRegistrationId("unknown"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsupported social provider");
    }
}
