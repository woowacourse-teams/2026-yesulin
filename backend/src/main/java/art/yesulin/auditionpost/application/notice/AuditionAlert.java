package art.yesulin.auditionpost.application.notice;

/** 알림 한 건과 눌렀을 때 열 주소. 가져온 공고는 예술in 상세, 가져오지 못한 공고는 경유 링크를 쓴다. */
public record AuditionAlert(AuditionContent content, String link) {
}
