package art.yesulin.application.auditionpost;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 본문 사진 자리 표시. 저장소 주소는 환경(LocalStack 포트, CDN 도메인)마다 달라지므로 본문에는
 * {@code post-file:{순번}}만 저장하고 응답할 때 실제 주소로 바꾼다.
 */
public final class AuditionPostBody {

    private static final String PLACEHOLDER_PREFIX = "post-file:";
    private static final Pattern PLACEHOLDER_IMAGE =
            Pattern.compile("<img\\b[^>]*\\bsrc=\"post-file:([0-9]{1,4})\"[^>]*>");

    private AuditionPostBody() {
    }

    public static String placeholder(int index) {
        return PLACEHOLDER_PREFIX + index;
    }

    /** 사진 자리를 순번의 주소로 바꾼다. 주소가 없는 자리는 깨진 사진 대신 태그째 지운다. */
    public static String render(String bodyHtml, List<String> imageUrls) {
        Matcher matcher = PLACEHOLDER_IMAGE.matcher(bodyHtml);
        StringBuilder rendered = new StringBuilder(bodyHtml.length());
        while (matcher.find()) {
            int index = Integer.parseInt(matcher.group(1));
            String replacement = "";
            if (index < imageUrls.size()) {
                replacement = matcher.group().replace(
                        "\"" + placeholder(index) + "\"",
                        "\"" + escapeAttribute(imageUrls.get(index)) + "\""
                );
            }
            matcher.appendReplacement(rendered, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(rendered);
        return rendered.toString();
    }

    private static String escapeAttribute(String value) {
        return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
