package art.yesulin.domain.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.domain.common.DomainException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EmailTest {

    @Test
    @DisplayName("이메일을 소문자로 정규화한다")
    void normalizesValidEmail() {
        // when
        Email email = Email.of("Applicant@Example.COM");

        // then
        assertThat(email.value()).isEqualTo("applicant@example.com");
    }

    @Test
    @DisplayName("이메일 형식이 아니면 생성할 수 없다")
    void rejectsInvalidEmail() {
        // when & then
        assertThatThrownBy(() -> Email.of("invalid-email"))
                .isInstanceOf(DomainException.class);
    }
}
