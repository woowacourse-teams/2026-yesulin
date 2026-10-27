package art.yesulin.actor.domain.page;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_HANDLE_INVALID;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_HANDLE_RESERVED;

import art.yesulin.global.exception.BusinessException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public record ActorPageHandle(String value) {

    private static final Pattern FORMAT = Pattern.compile("^(?!\\.)(?!.*\\.\\.)(?!.*\\.$)[a-z0-9._]{1,30}$");
    private static final Set<String> RESERVED = Set.of(
            "admin", "administrator", "yesulin", "official", "support", "help", "api", "www",
            "me", "root", "system", "null", "undefined"
    );

    public ActorPageHandle {
        value = normalize(value);
        if (!hasValidFormat(value)) {
            throw new BusinessException(ACTOR_HANDLE_INVALID, "아이디는 영문 소문자·숫자·마침표·밑줄 1~30자로 입력해 주세요.");
        }
        if (isReserved(value)) {
            throw new BusinessException(ACTOR_HANDLE_RESERVED, "사용할 수 없는 예약된 아이디입니다.");
        }
    }

    public static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean hasValidFormat(String value) {
        return value != null && FORMAT.matcher(value).matches();
    }

    public static boolean isReserved(String value) {
        return RESERVED.contains(value);
    }
}
