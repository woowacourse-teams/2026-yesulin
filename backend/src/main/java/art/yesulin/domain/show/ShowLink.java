package art.yesulin.domain.show;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.show.ShowErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관객이 예매 안내에서 누르는 외부 링크(공연사 SNS, 홈페이지 등)다. 버튼 이름과 http/https 주소를 함께 가진다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShowLink {

    public static final int MAX_LABEL_LENGTH = 30;
    public static final int MAX_URL_LENGTH = 500;
    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

    @Column(nullable = false, length = MAX_LABEL_LENGTH)
    private String label;

    @Column(nullable = false, length = MAX_URL_LENGTH)
    private String url;

    public ShowLink(String label, String url) {
        this.label = requireLabel(label);
        this.url = requireUrl(url);
    }

    private static String requireLabel(String label) {
        String normalized = requireText(label, "안내 링크의 버튼 이름은 필수입니다.");
        if (normalized.length() > MAX_LABEL_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "안내 링크의 버튼 이름은 %d자를 넘을 수 없습니다.", MAX_LABEL_LENGTH);
        }
        return normalized;
    }

    private static String requireUrl(String url) {
        String normalized = requireText(url, "안내 링크 주소는 필수입니다.");
        if (normalized.length() > MAX_URL_LENGTH || !isWebAddress(normalized)) {
            throw new BusinessException(INVALID_INPUT, "안내 링크는 https://로 시작하는 올바른 주소로 입력해 주세요.");
        }
        return normalized;
    }

    /** 도메인에 점이 없는 주소(https://instagram 등)는 입력 실수로 보고 받지 않는다. */
    private static boolean isWebAddress(String value) {
        try {
            URI uri = new URI(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            return scheme != null && ALLOWED_SCHEMES.contains(scheme.toLowerCase(Locale.ROOT))
                    && host != null && host.contains(".") && !host.startsWith(".") && !host.endsWith(".");
        } catch (URISyntaxException exception) {
            return false;
        }
    }
}
