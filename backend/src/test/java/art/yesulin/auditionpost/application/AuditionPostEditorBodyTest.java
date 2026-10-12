package art.yesulin.auditionpost.application;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AuditionPostEditorBodyTest {

    private static final AuditionPostFile POSTER = image("poster");
    private static final AuditionPostFile DETAIL = image("detail");
    private static final Map<String, AuditionPostFile> IMAGES = Map.of(
            "https://cdn.test/poster.png", POSTER,
            "https://cdn.test/detail.png", DETAIL
    );

    @Test
    void numbersOwnImagesInBodyOrderAndDropsOthers() {
        String html = "<p><img src=\"https://cdn.test/detail.png\" alt=\"상세\"></p>"
                + "<img src=\"https://tracker.test/pixel.gif\">"
                + "<p><img src=\"https://cdn.test/poster.png\"><img src=\"https://cdn.test/detail.png\"></p>";

        AuditionPostEditorBody.Result result = AuditionPostEditorBody.toStored(html, IMAGES);

        assertEquals(
                "<p><img src=\"post-file:0\" alt=\"상세\"></p>"
                        + "<p><img src=\"post-file:1\"><img src=\"post-file:0\"></p>",
                result.bodyHtml()
        );
        assertEquals(List.of(DETAIL, POSTER), result.images());
    }

    @Test
    void appliesSharedBodyRules() {
        String html = "<p onclick=\"x()\">안내</p><script>alert(1)</script>"
                + "<p><a href=\"https://forms.gle/abc\">지원서</a> <a href=\"/relative\">상대</a></p>";

        AuditionPostEditorBody.Result result = AuditionPostEditorBody.toStored(html, IMAGES);

        assertEquals(
                "<p>안내</p><p><a href=\"https://forms.gle/abc\" target=\"_blank\" "
                        + "rel=\"noopener noreferrer nofollow\">지원서</a> <a>상대</a></p>",
                result.bodyHtml()
        );
        assertEquals(List.of(), result.images());
    }

    private static AuditionPostFile image(String name) {
        return new AuditionPostFile(AuditionPostFileKind.IMAGE, "public/" + name, name + ".png", "image/png", 10);
    }
}
