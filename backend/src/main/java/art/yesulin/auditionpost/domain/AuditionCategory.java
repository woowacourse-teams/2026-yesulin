package art.yesulin.auditionpost.domain;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * 우리 서비스가 알림·게시하는 공고 분류. 표기는 OTR 분류와 같다. 영화·댄스·방송·모델 등 그 밖의 분류는
 * 알림을 보내지 않고 게시하지도 않는다.
 */
public enum AuditionCategory {

    PLAY("연극"),
    PERFORMANCE("퍼포먼스"),
    MUSICAL("뮤지컬"),
    TROUPE("단원"),
    AGENCY("기획사");

    private final String label;

    AuditionCategory(String label) {
        this.label = label;
    }

    public static boolean supports(String label) {
        String trimmed = label == null ? "" : label.trim();
        return Arrays.stream(values()).anyMatch(category -> category.label.equals(trimmed));
    }

    /** 안내 문구용 {@code 연극·퍼포먼스·뮤지컬·단원·기획사}. */
    public static String labels() {
        return Arrays.stream(values()).map(category -> category.label).collect(Collectors.joining("·"));
    }
}
