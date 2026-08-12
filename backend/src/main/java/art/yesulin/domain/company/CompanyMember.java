package art.yesulin.domain.company;

import art.yesulin.domain.account.AccountId;
import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;

public final class CompanyMember {

    private final CompanyMemberId id;
    private final AccountId accountId;
    private final CompanyId companyId;
    private final CompanyRole role;

    private CompanyMember(
            CompanyMemberId id, AccountId accountId, CompanyId companyId, CompanyRole role) {
        this.id = id;
        this.accountId = accountId;
        this.companyId = companyId;
        this.role = role;
    }

    public static CompanyMember restore(
            CompanyMemberId id, AccountId accountId, CompanyId companyId, CompanyRole role) {
        return new CompanyMember(id, accountId, companyId, role);
    }

    public void requireCompanyAccess(CompanyId targetCompanyId) {
        if (!companyId.equals(targetCompanyId)) {
            throw new DomainException(DomainError.COMPANY_ACCESS_DENIED);
        }
    }

    public CompanyMemberId id() {
        return id;
    }

    public AccountId accountId() {
        return accountId;
    }

    public CompanyId companyId() {
        return companyId;
    }

    public CompanyRole role() {
        return role;
    }
}
