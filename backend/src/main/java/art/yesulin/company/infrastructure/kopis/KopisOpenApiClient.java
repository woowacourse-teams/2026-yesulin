package art.yesulin.company.infrastructure.kopis;

import art.yesulin.company.application.kopis.KopisCompany;
import art.yesulin.company.application.kopis.KopisCompanySearch;
import art.yesulin.company.application.kopis.KopisUnavailableException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * KOPIS Open API의 기획제작사 목록({@code /openApi/restful/mnfct})을 이름으로 찾는다. KOPIS는 짧은 시간에 여러 번 부르면
 * 막으므로 찾은 결과를 12시간 기억한다. 인증키는 주소에 들어가므로 주소를 로그에 남기지 않는다.
 */
@Component
public class KopisOpenApiClient implements KopisCompanySearch {

    private static final Logger LOGGER = LoggerFactory.getLogger(KopisOpenApiClient.class);
    private static final String BASE_URL = "https://kopis.or.kr/openApi/restful/mnfct";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(6);
    private static final Duration CACHE_TTL = Duration.ofHours(12);
    private static final int MAX_RESULTS = 10;
    private static final int MAX_RECENT_WORKS = 5;

    private final String apiKey;
    private final HttpClient httpClient;
    private final Cache<String, List<KopisCompany>> cache = Caffeine.newBuilder()
            .expireAfterWrite(CACHE_TTL)
            .maximumSize(500)
            .build();

    @Autowired
    public KopisOpenApiClient(@Value("${yesulin.kopis.api-key:}") String apiKey) {
        this(apiKey, HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build());
    }

    KopisOpenApiClient(String apiKey, HttpClient httpClient) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.httpClient = httpClient;
    }

    @Override
    public List<KopisCompany> searchByName(String name) {
        if (apiKey.isEmpty()) {
            throw new KopisUnavailableException("KOPIS 인증키가 없습니다.");
        }
        return cache.get(name, this::fetch);
    }

    private List<KopisCompany> fetch(String name) {
        HttpRequest request = HttpRequest.newBuilder(uri(name))
                .timeout(REQUEST_TIMEOUT)
                .header("Accept", "application/xml")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            return parse(response.statusCode(), response.body());
        } catch (IOException exception) {
            throw unavailable("KOPIS에 연결하지 못했습니다.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw unavailable("KOPIS 조회가 중단됐습니다.", exception);
        }
    }

    static List<KopisCompany> parse(int status, String body) {
        if (status != 200 || body == null || !body.contains("<dbs")) {
            throw unavailable("KOPIS가 기획제작사 목록을 주지 않았습니다. status=" + status, null);
        }
        Document document = Jsoup.parse(body, "", Parser.xmlParser());
        return document.select("dbs > db").stream()
                .map(KopisOpenApiClient::company)
                .filter(company -> company.name() != null)
                .toList();
    }

    private static KopisCompany company(Element db) {
        return new KopisCompany(
                text(db, "mt30id"),
                text(db, "entrpsnm"),
                text(db, "genrenm"),
                text(db, "telno"),
                text(db, "relateurl"),
                works(text(db, "prfnm"))
        );
    }

    private static List<String> works(String value) {
        if (value == null) {
            return List.of();
        }
        return Arrays.stream(value.split(",\\s*"))
                .map(String::trim)
                .filter(work -> !work.isEmpty())
                .limit(MAX_RECENT_WORKS)
                .toList();
    }

    private static String text(Element db, String tag) {
        Element element = db.selectFirst(tag);
        if (element == null) {
            return null;
        }
        String text = element.text().trim();
        return text.isEmpty() ? null : text;
    }

    private URI uri(String name) {
        return URI.create(BASE_URL
                + "?service=" + encode(apiKey)
                + "&cpage=1&rows=" + MAX_RESULTS
                + "&entrpsnm=" + encode(name));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static KopisUnavailableException unavailable(String message, Exception cause) {
        LOGGER.atWarn()
                .addKeyValue("event", "KOPIS_COMPANY_SEARCH_FAILED")
                .log("KOPIS 기획제작사 조회 실패 reason={}", message);
        return new KopisUnavailableException(message, cause);
    }
}
