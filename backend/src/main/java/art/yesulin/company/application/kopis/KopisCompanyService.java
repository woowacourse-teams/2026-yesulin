package art.yesulin.company.application.kopis;

import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 운영자가 공연사 정보를 쓸 때 KOPIS 기획제작사를 찾아 처음 값으로 준다. OTR 닉네임에는 "(주)" 같은 회사 형태가 붙어 있어
 * 떼고 찾는다. 찾은 정보는 저장하지 않으며 운영자가 확인해 고친 뒤 저장한다.
 */
@Service
@RequiredArgsConstructor
public class KopisCompanyService {

    private static final int MIN_QUERY_LENGTH = 2;
    private static final int MAX_QUERY_LENGTH = 50;
    private static final Pattern COMPANY_FORM = Pattern.compile(
            "\\((?:주|사|재|유|합)\\)|㈜|주식회사|사단법인|재단법인|유한회사|협동조합"
    );

    private final KopisCompanySearch search;

    public KopisCompanySearchResult search(String name) {
        String query = queryOf(name);
        if (query.length() < MIN_QUERY_LENGTH) {
            return new KopisCompanySearchResult(true, query, List.of());
        }
        try {
            return new KopisCompanySearchResult(true, query, search.searchByName(query));
        } catch (KopisUnavailableException exception) {
            return new KopisCompanySearchResult(false, query, List.of());
        }
    }

    /** 회사 형태 표시와 겹친 공백을 지운다. 예: {@code (주)크리티브} → {@code 크리티브} */
    static String queryOf(String name) {
        if (name == null) {
            return "";
        }
        String query = COMPANY_FORM.matcher(name).replaceAll(" ").replaceAll("\\s+", " ").trim();
        if (query.length() > MAX_QUERY_LENGTH) {
            query = query.substring(0, MAX_QUERY_LENGTH).trim();
        }
        return query;
    }
}
