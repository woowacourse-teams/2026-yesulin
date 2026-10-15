package art.yesulin.company.application.kopis;

/** 인증키가 없거나 KOPIS가 응답하지 않아 찾지 못했다. 운영자는 KOPIS 없이 직접 쓴다. */
public class KopisUnavailableException extends RuntimeException {

    public KopisUnavailableException(String message) {
        super(message);
    }

    public KopisUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
