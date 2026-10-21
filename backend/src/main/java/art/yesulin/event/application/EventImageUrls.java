package art.yesulin.event.application;

/**
 * 운영자가 저장하는 이벤트 이미지 주소. 지금 이미지 주소면 그대로 두고, 이 운영자가 새로 올린 이미지 주소면 바꾸고, 비우면 지운다.
 */
public record EventImageUrls(String coverUrl, String bannerDesktopUrl, String bannerMobileUrl) {
}
