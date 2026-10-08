package art.yesulin.auditionpost.application.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class AuditionContentTest {

    @Test
    void preservesPayAndDeadlineWithoutPersistingThem() {
        AuditionContent content = new AuditionContent("22310", null,
                "배우 모집", " 협의 ", "상시", "https://otr.co.kr/audition/?vid=22310");

        assertThat(content.externalId()).isEqualTo("22310");
        assertThat(content.pay()).isEqualTo("협의");
        assertThat(content.deadline()).isEqualTo("상시");
        assertThat(content.category()).isEmpty();
        assertThatThrownBy(() -> new AuditionContent("", "", "공고", "", "", "url"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AuditionContent(content.externalId(), "", "", "", "", "url"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
