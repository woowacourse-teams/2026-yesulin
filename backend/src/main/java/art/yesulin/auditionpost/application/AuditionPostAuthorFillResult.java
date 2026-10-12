package art.yesulin.auditionpost.application;

/**
 * 원문 작성자 번호 채우기 한 번의 결과.
 *
 * @param checked 이번에 원문을 읽은 공고 수
 * @param filled 번호를 채운 공고 수
 * @param connected 채운 번호에 자동 연결 규칙이 있어 기획사에 연결한 공고 수
 * @param failed 원문을 읽지 못한 공고 수(내려간 공고 등)
 * @param nextBeforeId 이어서 읽을 위치. 더 읽을 공고가 없으면 null이다.
 * @param remaining 아직 번호가 없는 원문 공고 수. 원문에 번호가 없는 공고도 포함한다.
 */
public record AuditionPostAuthorFillResult(
        int checked,
        int filled,
        int connected,
        int failed,
        Long nextBeforeId,
        long remaining
) {
}
