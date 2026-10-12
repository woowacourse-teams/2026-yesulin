package art.yesulin.auditionpost.presentation.api.admin;

/**
 * 원문 작성자 번호 채우기를 이어서 한다.
 *
 * @param beforeId 이전 결과의 {@code nextBeforeId}. 처음이면 null이다.
 */
public record FillAuditionPostAuthorsRequest(Long beforeId) {
}
