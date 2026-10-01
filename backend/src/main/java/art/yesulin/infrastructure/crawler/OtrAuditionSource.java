package art.yesulin.infrastructure.crawler;

import art.yesulin.application.notice.AuditionContent;
import art.yesulin.application.notice.AuditionSource;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

@Component
public class OtrAuditionSource implements AuditionSource {

    private static final String AUDITION_URL = "https://otr.co.kr/audition/";
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; YesulinNoticeCrawler/0.1)";
    private static final Pattern VID_PATTERN = Pattern.compile("(?:^|&)vid=([0-9]{1,30})(?:&|$)");
    private static final Pattern NUMERIC_ID_PATTERN = Pattern.compile("[0-9]{1,30}");
    private static final int TIMEOUT_MILLIS = 5_000;
    private static final int MAX_BODY_BYTES = 4 * 1024 * 1024;

    @Override
    public String getSource() {
        return "OTR";
    }

    @Override
    public List<AuditionContent> fetchRecent() {
        Document document = fetch(AUDITION_URL);
        Elements rows = document.select("tr[id^=mb_audition_tr_]");
        if (rows.isEmpty()) {
            throw new IllegalStateException("OTR 공고 목록을 찾을 수 없습니다.");
        }
        List<AuditionContent> contents = new ArrayList<>();
        for (Element row : rows) {
            if (!row.hasClass("mb-notice")) {
                contents.add(parseListRow(row));
            }
        }
        return List.copyOf(contents);
    }

    private AuditionContent parseListRow(Element row) {
        Elements cells = row.children();
        if (cells.size() < 5) {
            throw new IllegalStateException("OTR 공고 목록의 열 구성이 달라졌습니다.");
        }
        Element link = requiredElement(cells.get(1), "a[href*=vid=]", "OTR 공고 링크를 찾을 수 없습니다.");
        String url = link.absUrl("href");
        String externalId = externalIdFrom(url);
        if (!externalId.equals(cells.get(0).text())) {
            throw new IllegalStateException("OTR 공고 번호와 링크가 일치하지 않습니다.");
        }
        Element categoryElement = cells.get(1).selectFirst(".category1-text");
        String category = categoryElement == null ? "" : categoryElement.text();
        if (category.startsWith("[") && category.endsWith("]")) {
            category = category.substring(1, category.length() - 1);
        }
        String title = link.attr("title").trim();
        String categoryPrefix = "[" + category + "]";
        if (!category.isEmpty() && title.startsWith(categoryPrefix)) {
            title = title.substring(categoryPrefix.length()).trim();
        }
        return new AuditionContent(
                externalId, category, title, cells.get(3).text(), cells.get(4).text(),
                AUDITION_URL + "?vid=" + externalId
        );
    }

    @Override
    public AuditionContent fetchById(String externalId) {
        if (externalId == null || !NUMERIC_ID_PATTERN.matcher(externalId).matches()) {
            throw new IllegalArgumentException("OTR 공고 식별자가 올바르지 않습니다.");
        }
        String url = AUDITION_URL + "?vid=" + externalId;
        Document document = fetch(url);
        Element canonical = requiredElement(document, "link[rel=canonical][href]", "OTR 공고 상세 링크를 찾을 수 없습니다.");
        String fetchedId = externalIdFrom(canonical.absUrl("href"));
        if (!externalId.equals(fetchedId)) {
            throw new IllegalStateException("다른 OTR 공고가 조회됐습니다: %s".formatted(fetchedId));
        }
        Element titleRow = requiredElement(document, "#mb_audition_tr_title", "OTR 공고 상세를 찾을 수 없습니다.");
        Element title = requiredElement(titleRow, "td span[style*='float:left']", "OTR 공고 제목을 찾을 수 없습니다.");
        return new AuditionContent(
                externalId,
                detailText(document, "#mb_audition_tr_category1 td"),
                title.text(),
                detailText(document, "#mb_audition_tr_ext2 td"),
                detailText(document, "#mb_audition_tr_edate td"),
                url
        );
    }

    private Document fetch(String url) {
        try {
            return Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT_MILLIS)
                    .maxBodySize(MAX_BODY_BYTES)
                    .get();
        } catch (IOException exception) {
            throw new IllegalStateException("OTR 공고 페이지를 읽지 못했습니다.", exception);
        }
    }

    private String externalIdFrom(String url) {
        URI uri = URI.create(url);
        if (!"https".equals(uri.getScheme()) || !"otr.co.kr".equals(uri.getHost())
                || !"/audition/".equals(uri.getPath()) || uri.getRawQuery() == null) {
            throw new IllegalStateException("OTR 공고 링크 형식이 올바르지 않습니다.");
        }
        Matcher matcher = VID_PATTERN.matcher(uri.getRawQuery());
        if (!matcher.find()) {
            throw new IllegalStateException("OTR 공고 링크에 vid가 없습니다.");
        }
        return matcher.group(1);
    }

    private Element requiredElement(Element parent, String selector, String message) {
        Element element = parent.selectFirst(selector);
        if (element == null) {
            throw new IllegalStateException(message);
        }
        return element;
    }

    private String detailText(Document document, String selector) {
        Element element = document.selectFirst(selector);
        return element == null ? "" : element.text();
    }
}
