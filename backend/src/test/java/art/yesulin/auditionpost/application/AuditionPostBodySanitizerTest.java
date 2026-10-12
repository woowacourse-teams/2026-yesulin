package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AuditionPostBodySanitizerTest {

    private static final String BASE_URL = "https://example.com/audition/?vid=1";

    @Test
    void removesScriptsStylesAndUnwrapsDivs() {
        String html = "<div><p style=\"color:red\" onclick=\"x()\">문단</p><div>중첩</div></div>"
                + "<script>alert(1)</script><iframe src=\"https://x.test\"></iframe><style>p{}</style>";

        assertEquals("<p>문단</p>중첩", sanitize(html));
    }

    @Test
    void removesLayoutAttributesFromImagesAndTables() {
        String html = "<img src=\"https://cdn.test/a.png\" width=\"100\" height=\"50\" align=\"left\" alt=\"포스터\">"
                + "<table width=\"100%\" summary=\"s\"><colgroup span=\"2\" width=\"1\"><col span=\"1\" width=\"2\">"
                + "</colgroup><tr><th scope=\"col\" abbr=\"a\" width=\"3\">배역</th>"
                + "<td axis=\"x\" width=\"4\" colspan=\"2\">햄릿</td></tr></table>";

        assertEquals(
                "<img src=\"https://cdn.test/a.png\" alt=\"포스터\">"
                        + "<table><colgroup><col></colgroup><tbody><tr><th>배역</th><td colspan=\"2\">햄릿</td></tr>"
                        + "</tbody></table>",
                sanitize(html)
        );
    }

    @Test
    void opensLinksInNewTabWithoutPassingReferrer() {
        String html = "<a href=\"https://forms.gle/abc\" target=\"_self\" rel=\"opener\">지원서</a>"
                + "<a href=\"/relative\">상대</a>";

        assertEquals(
                "<a href=\"https://forms.gle/abc\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">지원서</a>"
                        + "<a href=\"https://example.com/relative\" target=\"_blank\" "
                        + "rel=\"noopener noreferrer nofollow\">상대</a>",
                sanitize(html)
        );
    }

    @Test
    void dropsScriptLinkAddress() {
        assertEquals("<a>js</a>", sanitize("<a href=\"javascript:alert(1)\">js</a>"));
    }

    @Test
    void keepsOriginalWhitespace() {
        String html = "<p>&lt;태그&gt; &amp; 공백</p>\n\n<ul>\n <li>하나</li>\n</ul>";

        assertEquals(html, sanitize(html));
    }

    private String sanitize(String html) {
        return AuditionPostBodySanitizer.finish(AuditionPostBodySanitizer.clean(html, BASE_URL));
    }
}
