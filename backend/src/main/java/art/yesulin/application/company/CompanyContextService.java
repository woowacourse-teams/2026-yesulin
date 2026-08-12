package art.yesulin.application.company;

public interface CompanyContextService {

    Long initialCompanyId(long accountId);

    void requireMembership(long accountId, long companyId);
}
