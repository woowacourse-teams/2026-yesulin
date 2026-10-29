package art.yesulin.event.application;

import java.util.List;

/** 운영자가 저장하는 이미지 주소. 상세 이미지는 배열 순서대로 표시하고, 비우면 지운다. */
public record EventImageUrls(
        String coverUrl, String bannerDesktopUrl, String bannerMobileUrl, List<String> detailUrls
) {

    public EventImageUrls {
        detailUrls = detailUrls == null ? List.of() : List.copyOf(detailUrls);
    }

    public EventImageUrls(String coverUrl, String bannerDesktopUrl, String bannerMobileUrl) {
        this(coverUrl, bannerDesktopUrl, bannerMobileUrl, List.of());
    }
}
