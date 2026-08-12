package art.yesulin.application.application;

public interface ApplicationSubmissionService {

    SubmissionResult submit(long authenticatedAccountId, SubmitApplicationCommand command);
}
