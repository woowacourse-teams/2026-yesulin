package art.yesulin.domain.draft;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.domain.account.AccountId;
import art.yesulin.domain.common.DomainException;
import art.yesulin.domain.recruitment.PostingId;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DraftTest {

    private static final Instant FIRST_MODIFIED_AT = Instant.parse("2026-08-12T01:00:00Z");
    private static final Instant SECOND_MODIFIED_AT = Instant.parse("2026-08-12T02:00:00Z");

    @Test
    @DisplayName("인증 전 Draft는 Application이 아니며 인증 뒤 계정에 연결할 수 있다")
    void attachesAnonymousDraft() {
        // given
        Draft draft = Draft.createAnonymous(new DraftId(1L), new PostingId(10L),
                DraftContent.of("{\"name\":\"지원자\"}"), FIRST_MODIFIED_AT);

        // when
        Draft attached = draft.attach(new AccountId(20L));

        // then
        assertThat(attached.owner()).contains(new AccountId(20L));
        assertThat(attached.status()).isEqualTo(DraftStatus.ACTIVE);
    }

    @Test
    @DisplayName("같은 Draft의 최신 수정본이 이전 내용 전체를 교체한다")
    void replacesWholeDraftWithNewerContent() {
        // given
        Draft draft = Draft.createAnonymous(new DraftId(1L), new PostingId(10L),
                DraftContent.of("{\"name\":\"이전\"}"), FIRST_MODIFIED_AT);

        // when
        Draft replaced = draft.replace(DraftContent.of("{\"name\":\"최신\"}"), SECOND_MODIFIED_AT);

        // then
        assertThat(replaced.content().json()).isEqualTo("{\"name\":\"최신\"}");
        assertThat(replaced.revision()).isEqualTo(2L);
    }

    @Test
    @DisplayName("과거 수정 시각으로 Draft를 덮어쓸 수 없다")
    void rejectsOlderDraftContent() {
        // given
        Draft draft = Draft.createAnonymous(new DraftId(1L), new PostingId(10L),
                DraftContent.of("{\"name\":\"최신\"}"), SECOND_MODIFIED_AT);

        // when & then
        assertThatThrownBy(() -> draft.replace(
                        DraftContent.of("{\"name\":\"과거\"}"), FIRST_MODIFIED_AT))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("제출 확정된 Draft는 다시 수정할 수 없다")
    void rejectsSubmittedDraftChange() {
        // given
        Draft draft = Draft.createAnonymous(new DraftId(1L), new PostingId(10L),
                DraftContent.of("{\"name\":\"지원자\"}"), FIRST_MODIFIED_AT)
                .attach(new AccountId(20L))
                .markSubmitted();

        // when & then
        assertThatThrownBy(() -> draft.replace(
                        DraftContent.of("{\"name\":\"변경\"}"), SECOND_MODIFIED_AT))
                .isInstanceOf(DomainException.class);
    }
}
