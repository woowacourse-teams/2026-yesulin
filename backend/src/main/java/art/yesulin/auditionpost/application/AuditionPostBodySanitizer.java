package art.yesulin.auditionpost.application;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

/**
 * 공고 본문 HTML의 허용 태그·링크 규칙. 원문에서 가져온 본문과 직접 작성한 본문이 같은 규칙을 따르도록 한곳에서 정한다.
 * 호출자는 {@link #clean(String, String)}으로 허용 태그만 남기고, 출처에 맞게 사진·링크를 손본 뒤
 * {@link #finish(Document)}로 꺼낸다. 공개 상세는 이 결과를 그대로 그리므로 본문은 반드시 이 두 단계를 거친다.
 */
public final class AuditionPostBodySanitizer {

    private static final String LINK_REL = "noopener noreferrer nofollow";
    private static final Safelist SAFELIST = Safelist.relaxed()
            .removeTags("div")
            .removeAttributes("img", "align", "width", "height")
            .removeAttributes("table", "summary", "width")
            .removeAttributes("td", "abbr", "axis", "width")
            .removeAttributes("th", "abbr", "axis", "scope", "width")
            .removeAttributes("col", "span", "width")
            .removeAttributes("colgroup", "span", "width");

    private AuditionPostBodySanitizer() {
    }

    /** 본문 조각을 읽는다. 꺼낼 때 Jsoup이 들여쓰기 공백을 끼워 넣지 않게 한다. */
    public static Document parse(String html, String baseUrl) {
        Document document = Jsoup.parseBodyFragment(html, baseUrl);
        document.outputSettings(outputSettings());
        return document;
    }

    /** 허용 태그·속성만 남긴다. 상대 주소는 {@code baseUrl} 기준 절대 주소로 바꾸고 허용하지 않는 주소의 링크·사진 속성은 버린다. */
    public static Document clean(String html, String baseUrl) {
        return parse(Jsoup.clean(html, baseUrl, SAFELIST, outputSettings()), baseUrl);
    }

    /** 남은 링크는 새 창으로 열며 검색 엔진과 상대 사이트에 우리 페이지를 넘기지 않는다. */
    public static String finish(Document body) {
        for (Element link : body.select("a[href]")) {
            link.attr("target", "_blank");
            link.attr("rel", LINK_REL);
        }
        return body.body().html();
    }

    private static Document.OutputSettings outputSettings() {
        return new Document.OutputSettings().prettyPrint(false);
    }
}
