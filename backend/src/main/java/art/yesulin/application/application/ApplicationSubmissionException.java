package art.yesulin.application.application;

public final class ApplicationSubmissionException extends RuntimeException {

    private final String code;

    public ApplicationSubmissionException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
