package art.yesulin.actor.application.profileimport;

/**
 * 편집 화면이 처음 열릴 때 보는 PDF로 채우기 상태.
 *
 * @param usedToday 오늘(한국 날짜) 제안 값이 나온 가져오기를 이미 했으면 true다. 실패와 빈 결과는 세지 않는다.
 * @param current 아직 지우지 않은 가장 최근 가져오기. 없으면 null이다.
 */
public record ProfileImportOverview(boolean usedToday, ProfileImportResult current) {
}
