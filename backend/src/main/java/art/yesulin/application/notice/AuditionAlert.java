package art.yesulin.application.notice;

/** 알림 한 건과 눌렀을 때 열 주소. 운영은 가져온 예술in 공고 상세, 개발은 경유 링크를 쓴다. */
public record AuditionAlert(AuditionContent content, String link) {
}
