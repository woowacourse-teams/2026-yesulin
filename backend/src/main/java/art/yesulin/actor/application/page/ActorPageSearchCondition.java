package art.yesulin.actor.application.page;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;

import java.util.Locale;

/** 배우 목록 조회 조건. 이름이나 아이디 일부로 찾는 검색어는 비어 있을 수 있고, 성별·나이·키 같은 조건은 여기에 더한다. */
public record ActorPageSearchCondition(ActorPageSort sort, String keyword) {

    public static final int MAX_KEYWORD_LENGTH = 30;

    public ActorPageSearchCondition {
        sort = requireNonNull(sort, "배우 목록 정렬은 필수입니다.");
        keyword = normalize(keyword);
    }

    public boolean hasKeyword() {
        return keyword != null;
    }

    /** 이름·아이디와 소문자로 비교하는 부분 일치 패턴. 검색어의 `%`·`_`는 문자 그대로 찾도록 `!`로 이스케이프한다. */
    public String likePattern() {
        String escaped = keyword.toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
        return "%" + escaped + "%";
    }

    private static String normalize(String keyword) {
        if (keyword == null) {
            return null;
        }
        String stripped = keyword.strip();
        if (stripped.startsWith("@")) {
            stripped = stripped.substring(1).strip();
        }
        if (stripped.isEmpty()) {
            return null;
        }
        if (stripped.length() > MAX_KEYWORD_LENGTH) {
            throw new IllegalArgumentException("검색어는 %d자 이하여야 합니다.".formatted(MAX_KEYWORD_LENGTH));
        }
        return stripped;
    }
}
