package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPostFile;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

/**
 * 편집기로 쓴 본문을 저장 형식으로 바꾼다. 공고 본문 공통 규칙으로 거른 뒤 이 공고의 사진(이미 저장됐거나 이번에 올린 사진)만
 * {@code post-file:{순번}} 자리 표시로 되돌리고 그 밖의 사진은 지운다. 외부 사진은 방문자 정보를 다른 서버로 넘기거나
 * 나중에 깨질 수 있어 남기지 않는다.
 */
public final class AuditionPostEditorBody {

    /** 편집기 본문은 절대 주소만 쓴다. 기준 주소가 없으므로 상대 주소 링크·사진은 남지 않는다. */
    private static final String NO_BASE_URL = "";

    private AuditionPostEditorBody() {
    }

    /**
     * 편집기 본문을 저장할 본문과 그 본문에 남은 사진으로 나눈다.
     *
     * @param imageOf 사진 공개 주소로 이 공고의 사진을 찾는다. 이 공고의 사진이 아니면 null을 돌려준다.
     * @return 저장할 본문과, 본문에 처음 나온 순서대로 정렬한 사진
     */
    public static Result toStored(String html, Function<String, AuditionPostFile> imageOf) {
        Document body = AuditionPostBodySanitizer.clean(html, NO_BASE_URL);
        List<AuditionPostFile> images = new ArrayList<>();
        for (Element image : body.select("img")) {
            AuditionPostFile file = imageOf.apply(image.attr("src"));
            if (file == null) {
                image.remove();
                continue;
            }
            int index = images.indexOf(file);
            if (index < 0) {
                images.add(file);
                index = images.size() - 1;
            }
            image.attr("src", AuditionPostBody.placeholder(index));
        }
        return new Result(AuditionPostBodySanitizer.finish(body), List.copyOf(images));
    }

    public record Result(String bodyHtml, List<AuditionPostFile> images) {
    }
}
