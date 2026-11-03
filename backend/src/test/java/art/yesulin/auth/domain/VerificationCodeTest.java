package art.yesulin.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class VerificationCodeTest {

    @Test
    void preservesLeadingZeroes() {
        // given
        int number = 123;
        // when
        VerificationCode code = VerificationCode.fromNumber(number);
        // then
        assertThat(code.value()).isEqualTo("000123");
    }

    @Test
    void rejectsAnythingOtherThanSixAsciiDigits() {
        // given
        String[] invalidCodes = {"12345", "1234567", "abcdef", "１２３４５６", "123 56"};
        // when, then
        for (String code : invalidCodes) {
            assertThatThrownBy(() -> new VerificationCode(code)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void doesNotExposeCodeInDiagnosticText() {
        // given
        VerificationCode code = new VerificationCode("123456");
        // when
        String diagnostic = code.toString();
        // then
        assertThat(diagnostic).doesNotContain("123456");
    }
}
