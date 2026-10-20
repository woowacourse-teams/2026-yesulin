package art.yesulin.event.domain;

import java.time.LocalDate;

/**
 * 운영자가 쓰는 이벤트 글 내용. 제목과 본문 말고는 비워 둘 수 있다.
 *
 * @param summary 목록 카드에 보일 한두 줄 소개
 * @param body 줄바꿈을 그대로 보여 주는 본문
 * @param startsOn 진행 시작일. 비우면 시작일 없이 진행 중으로 본다.
 * @param endsOn 진행 종료일. 지나면 마감으로 보인다.
 * @param applyUrl 상세 화면의 신청 버튼이 여는 주소. 비우면 버튼이 없다.
 * @param applyLabel 신청 버튼 문구. 주소만 있으면 화면이 기본 문구를 쓴다.
 */
public record EventContent(
        String title,
        String summary,
        String body,
        LocalDate startsOn,
        LocalDate endsOn,
        String applyUrl,
        String applyLabel
) {
}
