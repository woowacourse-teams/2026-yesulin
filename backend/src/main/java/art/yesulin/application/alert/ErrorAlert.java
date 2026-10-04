package art.yesulin.application.alert;

/**
 * 예상하지 못한 서버 오류를 운영자에게 알린다. 요청 처리를 기다리게 하지 않도록 구현은 바로 반환하고,
 * 알림 실패를 호출한 쪽으로 던지지 않는다. 개인정보가 섞일 수 있는 예외 메시지와 요청 값은 넘기지 않는다.
 */
public interface ErrorAlert {

    void unexpected(UnexpectedError error);

    /**
     * 알림에 담는 오류 위치다.
     *
     * @param endpoint 경로 변수를 채우기 전의 요청 패턴. 패턴을 찾지 못하면 요청 경로다.
     * @param requestId 로그에서 같은 요청을 찾는 요청 ID
     */
    record UnexpectedError(String method, String endpoint, String exception, String requestId) {
    }
}
