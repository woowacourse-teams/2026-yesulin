package art.yesulin.application.application;

import java.util.List;

public interface ApplicantApplicationQueryService {

    List<ApplicantApplicationSummary> findAll(long accountId);

    ApplicantApplicationDetail findOne(long accountId, long applicationId);
}
