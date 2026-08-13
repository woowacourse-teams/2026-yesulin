package art.yesulin.infrastructure.company;

import art.yesulin.application.company.ActiveCompanyAccessException;
import art.yesulin.application.company.ProducerProfileResult;
import art.yesulin.application.company.ProducerProfileService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProducerProfileServiceAdapter implements ProducerProfileService {

    private final CompanyJpaRepository companyRepository;
    private final CompanyMemberJpaRepository memberRepository;
    private final Clock clock;

    public ProducerProfileServiceAdapter(
            CompanyJpaRepository companyRepository,
            CompanyMemberJpaRepository memberRepository,
            Clock clock) {
        this.companyRepository = companyRepository;
        this.memberRepository = memberRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    @Override
    public ProducerProfileResult get(long accountId, long companyId) {
        return result(requireCompany(accountId, companyId));
    }

    @Transactional
    @Override
    public ProducerProfileResult update(
            long accountId,
            long companyId,
            String companyName,
            String contactName,
            String contactRole,
            String description) {
        CompanyJpaEntity company = requireCompany(accountId, companyId);
        company.updateProfile(
                companyName == null ? company.name() : companyName,
                contactName == null ? company.contactName() : contactName,
                contactRole == null ? company.contactRole() : contactRole,
                description == null ? company.description() : description,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        return result(company);
    }

    private CompanyJpaEntity requireCompany(long accountId, long companyId) {
        if (!memberRepository.existsByAccountIdAndCompanyId(accountId, companyId)) {
            throw new ActiveCompanyAccessException("활성 공연사에 접근할 수 없습니다.");
        }
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ActiveCompanyAccessException(
                        "활성 공연사를 찾을 수 없습니다."));
    }

    private ProducerProfileResult result(CompanyJpaEntity company) {
        return new ProducerProfileResult(
                company.name(), company.contactName(), company.contactRole(), company.logoUrl(),
                company.description(), company.contactEmail(), company.businessNumber(),
                company.representativeName(), company.verificationStatus(),
                company.verifiedAt() == null ? null
                        : company.verifiedAt().toInstant(ZoneOffset.UTC));
    }
}
