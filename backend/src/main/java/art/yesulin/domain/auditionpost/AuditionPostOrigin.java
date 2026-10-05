package art.yesulin.domain.auditionpost;

import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import java.net.URI;

/** 게시글을 가져온 외부 출처와 원문 번호·주소. 원문 주소는 상세 화면의 출처 표시에 쓴다. */
public record AuditionPostOrigin(String source, String externalId, String sourceUrl) {

    public AuditionPostOrigin {
        if (source == null || source.isBlank() || source.length() > 20) {
            throw invalid("공고 출처는 1~20자여야 합니다.");
        }
        if (externalId == null || !externalId.matches("[0-9A-Za-z_-]{1,30}")) {
            throw invalid("원문 공고 번호가 올바르지 않습니다.");
        }
        if (sourceUrl == null || sourceUrl.length() > 500 || !isHttps(sourceUrl)) {
            throw invalid("원문 주소는 500자 이하의 https 주소여야 합니다.");
        }
    }

    private static boolean isHttps(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost() != null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
