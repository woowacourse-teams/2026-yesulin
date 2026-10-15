package art.yesulin.company.application.kopis;

import java.util.List;

/**
 * KOPIS 기획제작사 검색 결과.
 *
 * @param available KOPIS를 불렀는지. 인증키가 없거나 응답하지 않으면 false이고 {@code companies}는 비어 있다.
 * @param query 실제로 찾은 이름. 회사 형태 표시를 뗀 값이다.
 */
public record KopisCompanySearchResult(boolean available, String query, List<KopisCompany> companies) {
}
