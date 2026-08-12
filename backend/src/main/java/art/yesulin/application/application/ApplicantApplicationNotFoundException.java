package art.yesulin.application.application;

public final class ApplicantApplicationNotFoundException extends RuntimeException {

    public ApplicantApplicationNotFoundException(long applicationId) {
        super("지원서를 찾을 수 없습니다. id=" + applicationId);
    }
}
