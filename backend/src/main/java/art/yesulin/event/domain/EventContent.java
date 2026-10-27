package art.yesulin.event.domain;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 운영자가 쓰는 이벤트 글 내용. 제목과 본문 말고는 비워 둘 수 있다.
 *
 * @param summary 목록 카드에 보일 한두 줄 소개
 * @param body 대표 이미지 옆에 줄바꿈을 그대로 보여 주는 자유 형식 개요
 * @param detailBody 하단의 선택적 상세 설명
 * @param startsOn 진행 시작일. 비우면 시작일 없이 진행 중으로 본다.
 * @param endsOn 진행 종료일. 지나면 마감으로 보인다.
 * @param applyUrl 상세 화면의 신청 버튼이 여는 주소. 비우면 버튼이 없다.
 * @param applyLabel 신청 버튼 문구. 주소만 있으면 화면이 기본 문구를 쓴다.
 * @param registrationEnabled 켜면 신청 버튼이 외부 주소 대신 예술in 참가 신청서를 연다.
 * @param registrationNotice 참가 신청서 위에 보여 줄 보증금·계좌 같은 안내. 신청서를 끄면 지운다.
 * @param businessCardClosesAt 배우의 프로필 명함 제작 희망을 받는 마감 시각. 비우면 신청 기간 내내 받고, 신청서를 끄면 지운다.
 */
public record EventContent(
        String title,
        String summary,
        String body,
        LocalDate startsOn,
        LocalDate endsOn,
        String applyUrl,
        String applyLabel,
        boolean registrationEnabled,
        String registrationNotice,
        String detailBody,
        Instant businessCardClosesAt
) {

    /** 명함 제작 마감 없이 쓰는 글. */
    public EventContent(
            String title, String summary, String body, LocalDate startsOn, LocalDate endsOn,
            String applyUrl, String applyLabel, boolean registrationEnabled, String registrationNotice,
            String detailBody
    ) {
        this(title, summary, body, startsOn, endsOn, applyUrl, applyLabel,
                registrationEnabled, registrationNotice, detailBody, null);
    }

    /** 상세 설명 없이 쓰던 글도 같은 개요를 유지한다. */
    public EventContent(
            String title, String summary, String body, LocalDate startsOn, LocalDate endsOn,
            String applyUrl, String applyLabel, boolean registrationEnabled, String registrationNotice
    ) {
        this(title, summary, body, startsOn, endsOn, applyUrl, applyLabel,
                registrationEnabled, registrationNotice, null);
    }

    /** 참가 신청서 없이 쓰는 글. */
    public EventContent(
            String title,
            String summary,
            String body,
            LocalDate startsOn,
            LocalDate endsOn,
            String applyUrl,
            String applyLabel
    ) {
        this(title, summary, body, startsOn, endsOn, applyUrl, applyLabel, false, null);
    }
}
