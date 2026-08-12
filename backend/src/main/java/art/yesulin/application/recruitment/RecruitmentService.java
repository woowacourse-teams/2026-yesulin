package art.yesulin.application.recruitment;

import java.util.List;

public interface RecruitmentService {

    PerformanceResult createPerformance(long companyId, PerformanceCommand command);

    List<PerformanceResult> performances(long companyId);

    PerformanceResult performance(long companyId, long performanceId);

    PerformanceResult updatePerformance(
            long companyId, long performanceId, PerformanceCommand command);

    void deletePerformance(long companyId, long performanceId);

    PostingResult createPosting(long companyId, long performanceId, PostingCommand command);

    List<PostingResult> postings(long companyId, long performanceId);

    PostingResult posting(long companyId, long postingId);

    PostingResult updatePosting(long companyId, long postingId, PostingCommand command);

    void deletePosting(long companyId, long postingId);

    RoleResult createRole(long companyId, long postingId, RoleCommand command);

    List<RoleResult> roles(long companyId, long postingId);
}
