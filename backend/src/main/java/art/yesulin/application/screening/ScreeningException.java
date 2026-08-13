package art.yesulin.application.screening;

public class ScreeningException extends RuntimeException {

    private final String code;

    public ScreeningException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
