package art.yesulin.company.application.kopis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class KopisCompanyServiceTest {

    private static final KopisCompany CREETIVE = new KopisCompany(
            "AG019413", "(주)크리티브(픽시클래스)", "뮤지컬", null, "https://blog.naver.com/creetive008", List.of("별주부")
    );

    @Test
    void searchesWithoutCompanyFormMarks() {
        List<String> queries = new ArrayList<>();
        KopisCompanyService service = new KopisCompanyService(name -> {
            queries.add(name);
            return List.of(CREETIVE);
        });

        KopisCompanySearchResult result = service.search(" (주)크리티브 ");

        assertEquals(List.of("크리티브"), queries);
        assertTrue(result.available());
        assertEquals("크리티브", result.query());
        assertEquals(List.of(CREETIVE), result.companies());
    }

    @Test
    void skipsTooShortQuery() {
        List<String> queries = new ArrayList<>();
        KopisCompanyService service = new KopisCompanyService(name -> {
            queries.add(name);
            return List.of(CREETIVE);
        });

        KopisCompanySearchResult result = service.search("㈜ 극");

        assertTrue(queries.isEmpty());
        assertTrue(result.companies().isEmpty());
    }

    @Test
    void reportsUnavailableKopisWithoutFailing() {
        KopisCompanyService service = new KopisCompanyService(name -> {
            throw new KopisUnavailableException("KOPIS 인증키가 없습니다.");
        });

        KopisCompanySearchResult result = service.search("극단 예술in");

        assertFalse(result.available());
        assertTrue(result.companies().isEmpty());
    }

    @Test
    void removesKoreanCompanyForms() {
        assertEquals("예술in", KopisCompanyService.queryOf("주식회사 예술in"));
        assertEquals("예술in", KopisCompanyService.queryOf("(사)예술in"));
        assertEquals("", KopisCompanyService.queryOf(null));
    }
}
