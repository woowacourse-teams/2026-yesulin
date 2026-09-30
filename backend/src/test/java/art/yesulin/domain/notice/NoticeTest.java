package art.yesulin.domain.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class NoticeTest {

    @Test
    void markSentSetsSentStatus() {
        Notice notice = Notice.pending("OTR", "22310");

        assertThat(notice.getSource()).isEqualTo("OTR");
        assertThat(notice.getExternalId()).isEqualTo("22310");
        assertThat(notice.getStatus()).isEqualTo(NoticeStatus.PENDING);

        notice.markSent();

        assertThat(notice.getStatus()).isEqualTo(NoticeStatus.SENT);
        notice.markSent();
        assertThat(notice.getStatus()).isEqualTo(NoticeStatus.SENT);
    }

    @Test
    void rejectsBlankExternalId() {
        assertThatThrownBy(() -> Notice.pending("OTR", " ")).isInstanceOf(IllegalArgumentException.class);
    }
}
