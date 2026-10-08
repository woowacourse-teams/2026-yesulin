package art.yesulin.auditionpost.application.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class OtrNoticeLinkTest {

    private final OtrNoticeLink noticeLink = new OtrNoticeLink("https://dev.yesulin.art/");

    @Test
    void createsProductionLinkForSharedNotifications() {
        assertThat(new OtrNoticeLink("https://yesulin.art").create("22310"))
                .isEqualTo("https://yesulin.art/otr?vid=22310");
    }

    @Test
    void createsOurLinkAndFixedOtrDestination() {
        assertThat(noticeLink.create("22310"))
                .isEqualTo("https://dev.yesulin.art/otr?vid=22310");
        assertThat(noticeLink.destination("22310").toString())
                .isEqualTo("https://otr.co.kr/audition/?vid=22310");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"abc", "22310&vid=1", "../22310", "https://example.com", "1234567890123456789012345678901"})
    void rejectsInvalidExternalIds(String externalId) {
        assertThatThrownBy(() -> noticeLink.create(externalId)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> noticeLink.destination(externalId)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "", "javascript:alert(1)", "https://user:password@example.com", "https://example.com/api",
            "https://example.com?next=other", "https://example.com#fragment"
    })
    void rejectsNonOriginBaseUrls(String baseUrl) {
        assertThatThrownBy(() -> new OtrNoticeLink(baseUrl)).isInstanceOf(IllegalArgumentException.class);
    }
}
