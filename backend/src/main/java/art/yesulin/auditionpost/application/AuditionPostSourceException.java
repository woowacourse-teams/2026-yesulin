package art.yesulin.auditionpost.application;

/** 원문 사이트에 접속하지 못했거나 응답 구조가 예상과 다르다. 메시지는 운영자 화면에 그대로 보여 준다. */
public class AuditionPostSourceException extends RuntimeException {

    public AuditionPostSourceException(String message) {
        super(message);
    }

    public AuditionPostSourceException(String message, Throwable cause) {
        super(message, cause);
    }
}
