package art.yesulin.infrastructure.company;

import art.yesulin.application.company.ActiveCompanyAccessException;
import art.yesulin.application.company.CompanyContextService;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CompanyContextServiceAdapter implements CompanyContextService {

    private final CompanyMemberJpaRepository memberRepository;

    public CompanyContextServiceAdapter(CompanyMemberJpaRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public Long initialCompanyId(long accountId) {
        List<Long> companyIds = memberRepository.findAllByAccountId(accountId).stream()
                .map(member -> member.companyId())
                .toList();
        return companyIds.size() == 1 ? companyIds.getFirst() : null;
    }

    @Override
    public void requireMembership(long accountId, long companyId) {
        if (memberRepository.findByAccountIdAndCompanyId(accountId, companyId).isEmpty()) {
            throw new ActiveCompanyAccessException("소속된 공연사만 활성 공연사로 선택할 수 있습니다.");
        }
    }
}
