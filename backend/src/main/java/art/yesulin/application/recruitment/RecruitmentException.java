package art.yesulin.application.recruitment;

public class RecruitmentException extends RuntimeException {

    private final String code;

    public RecruitmentException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
