package art.yesulin.auditionpost.application;

import java.net.URI;

/** 공개 상세 주소를 열었을 때 보여 줄 것. 공개 중이면 우리 상세, 숨겼으면 원문 공고다. */
public sealed interface PublicAuditionPostView {

    record Published(PublicAuditionPostResult post) implements PublicAuditionPostView {
    }

    /** 이미 퍼진 상세 링크가 끊기지 않도록 원문 공고로 보낸다. */
    record Hidden(URI originalUrl) implements PublicAuditionPostView {
    }
}
