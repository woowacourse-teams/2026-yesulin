package art.yesulin.application.auditionpost;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class AuditionPostBodyTest {

    @Test
    void replacesPlaceholdersWithImageUrls() {
        String body = "<p>a</p><img src=\"post-file:0\" alt=\"포스터\"><img alt=\"\" src=\"post-file:1\">";

        String rendered = AuditionPostBody.render(body, List.of("https://cdn.test/0.png", "https://cdn.test/1.png?a=1&b=2"));

        assertEquals(
                "<p>a</p><img src=\"https://cdn.test/0.png\" alt=\"포스터\">"
                        + "<img alt=\"\" src=\"https://cdn.test/1.png?a=1&amp;b=2\">",
                rendered
        );
    }

    @Test
    void removesImagesWithoutStoredFile() {
        String body = "<p>a</p><img src=\"post-file:3\"><p>b</p>";

        assertEquals("<p>a</p><p>b</p>", AuditionPostBody.render(body, List.of("https://cdn.test/0.png")));
    }

    @Test
    void doesNotConfuseTenWithOne() {
        String body = "<img src=\"post-file:1\"><img src=\"post-file:10\">";
        List<String> urls = IntStream.rangeClosed(0, 10).mapToObj(index -> "u" + index).toList();

        assertEquals("<img src=\"u1\"><img src=\"u10\">", AuditionPostBody.render(body, urls));
    }
}
