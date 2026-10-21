package art.yesulin.event.domain;

/**
 * 이벤트 이미지의 공개 저장소 키. 없는 이미지는 null이다.
 *
 * @param coverKey 목록 카드와 상세 상단에 보일 대표 이미지
 * @param bannerDesktopKey PC 메인 배너(3.2:1)
 * @param bannerMobileKey 모바일 메인 배너(4:3)
 */
public record EventImages(String coverKey, String bannerDesktopKey, String bannerMobileKey) {

    public static EventImages none() {
        return new EventImages(null, null, null);
    }
}
