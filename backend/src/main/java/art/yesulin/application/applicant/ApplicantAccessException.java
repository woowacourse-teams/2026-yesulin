package art.yesulin.application.applicant;

public final class ApplicantAccessException extends RuntimeException {

    public ApplicantAccessException() {
        super("지원자 계정이 필요합니다.");
    }
}
