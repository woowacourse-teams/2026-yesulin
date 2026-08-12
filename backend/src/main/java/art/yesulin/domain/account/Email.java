package art.yesulin.domain.account;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;
import java.util.Locale;
import java.util.regex.Pattern;

public record Email(String value) { // no-excuse-ok: domain value object

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    public Email {
        if (value == null || !EMAIL_PATTERN.matcher(value).matches()) {
            throw new DomainException(DomainError.INVALID_EMAIL);
        }
    }

    public static Email of(String value) {
        if (value == null) {
            throw new DomainException(DomainError.INVALID_EMAIL);
        }
        return new Email(value.trim().toLowerCase(Locale.ROOT));
    }
}
