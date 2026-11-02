package art.yesulin.auth.domain;

import java.util.Locale;

public record VerificationCode(String value) {

    public VerificationCode {
        if (value == null || !value.matches("[0-9]{6}")) {
            throw new IllegalArgumentException("인증번호는 숫자 6자리로 입력해 주세요.");
        }
    }

    public static VerificationCode fromNumber(int number) {
        return new VerificationCode(String.format(Locale.ROOT, "%06d", number));
    }

    @Override
    public String toString() {
        return "VerificationCode[REDACTED]";
    }
}
