package art.yesulin.application.applicant;

public interface ApplicantProfileService {

    ApplicantProfileResult get(long accountId);

    ApplicantProfileResult update(long accountId, ApplicantProfileCommand command);
}
