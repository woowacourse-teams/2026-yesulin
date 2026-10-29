package art.yesulin.event.presentation.api.admin;

import art.yesulin.event.application.EventImageUrls;
import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventBannerSetting;
import art.yesulin.event.domain.EventContent;
import art.yesulin.event.domain.EventImages;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 이벤트 글을 통째로 저장한다. 제목과 본문 말고는 비워 둘 수 있고, 비운 항목은 지운다.
 *
 * @param registrationEnabled 켜면 신청 버튼이 외부 주소 대신 예술in 참가 신청서를 연다.
 * @param registrationNotice 참가 신청서 위에 보여 줄 보증금·계좌 같은 안내
 * @param businessCardClosesAt 배우의 프로필 명함 제작 희망을 받는 마감 시각. 비우면 신청 기간 내내 받는다.
 * @param coverImageUrl 대표 이미지 공개 주소. 지금 이미지면 그대로 두고, 새로 올린 이미지면 바꾸고, 비우면 지운다.
 * @param banner 메인 배너 설정. 비우면 배너를 끈다.
 */
public record WriteEventRequest(
        @NotBlank @Size(max = Event.MAX_TITLE_LENGTH) String title,
        @Size(max = Event.MAX_SUMMARY_LENGTH) String summary,
        @NotBlank @Size(max = Event.MAX_BODY_LENGTH) String body,
        LocalDate startsOn,
        LocalDate endsOn,
        @Size(max = Event.MAX_URL_LENGTH) String applyUrl,
        @Size(max = Event.MAX_APPLY_LABEL_LENGTH) String applyLabel,
        boolean registrationEnabled,
        @Size(max = Event.MAX_REGISTRATION_NOTICE_LENGTH) String registrationNotice,
        @Size(max = MAX_IMAGE_URL_LENGTH) String coverImageUrl,
        @Size(max = Event.MAX_BODY_LENGTH) String detailBody,
        @Size(max = EventImages.MAX_DETAIL_IMAGES)
        List<@NotBlank @Size(max = MAX_IMAGE_URL_LENGTH) String> detailImageUrls,
        @Valid Banner banner,
        Instant businessCardClosesAt,
        boolean registrationConfirmationEnabled,
        @Size(max = Event.MAX_REGISTRATION_NOTICE_LENGTH) String registrationConfirmationMessage,
        @Min(1) Integer registrationCapacity
) {

    private static final int MAX_IMAGE_URL_LENGTH = 1000;

    public EventContent toContent() {
        return new EventContent(
                title, summary, body, startsOn, endsOn, applyUrl, applyLabel,
                registrationEnabled, registrationNotice, detailBody, businessCardClosesAt,
                registrationConfirmationEnabled, registrationConfirmationMessage, registrationCapacity
        );
    }

    public EventBannerSetting toBannerSetting() {
        return banner == null ? EventBannerSetting.disabled() : banner.toSetting();
    }

    public EventImageUrls toImageUrls() {
        return new EventImageUrls(
                coverImageUrl,
                banner == null ? null : banner.desktopImageUrl(),
                banner == null ? null : banner.mobileImageUrl(),
                detailImageUrls
        );
    }

    /**
     * 메인 배너 설정. 이미지 주소는 대표 이미지와 같은 방식으로 확정한다.
     *
     * @param desktopImageUrl PC 배너(3.2:1) 공개 주소
     * @param mobileImageUrl 모바일 배너(4:3) 공개 주소
     * @param alt 배너 이미지에 적힌 문구를 옮긴 대체 문구
     * @param endsOn 이 날까지 노출한다. 비우면 내릴 때까지 노출한다.
     */
    public record Banner(
            boolean enabled,
            @Size(max = MAX_IMAGE_URL_LENGTH) String desktopImageUrl,
            @Size(max = MAX_IMAGE_URL_LENGTH) String mobileImageUrl,
            @Size(max = Event.MAX_BANNER_ALT_LENGTH) String alt,
            LocalDate endsOn,
            @Min(0) @Max(Event.MAX_BANNER_ORDER) int order
    ) {

        EventBannerSetting toSetting() {
            return new EventBannerSetting(enabled, alt, endsOn, order);
        }
    }
}
