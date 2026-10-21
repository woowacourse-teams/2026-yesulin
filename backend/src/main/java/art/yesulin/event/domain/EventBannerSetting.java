package art.yesulin.event.domain;

import java.time.LocalDate;

/**
 * 메인 배너 노출 설정. 배너 이미지는 {@link EventImages}로 따로 받는다.
 *
 * @param enabled 메인 배너에 노출할지. 켜려면 PC·모바일 배너 이미지와 대체 문구가 모두 있어야 한다.
 * @param alt 배너 이미지에 적힌 문구를 옮긴 대체 문구
 * @param endsOn 이 날까지 노출한다. 비우면 내릴 때까지 노출한다.
 * @param order 작은 순서부터 보인다.
 */
public record EventBannerSetting(boolean enabled, String alt, LocalDate endsOn, int order) {

    public static EventBannerSetting disabled() {
        return new EventBannerSetting(false, null, null, 0);
    }
}
