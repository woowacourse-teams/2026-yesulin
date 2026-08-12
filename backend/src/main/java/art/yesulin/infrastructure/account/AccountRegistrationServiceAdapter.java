package art.yesulin.infrastructure.account;

import art.yesulin.application.account.AccountConflictException;
import art.yesulin.application.account.AccountRegistrationService;
import art.yesulin.application.account.ApplicantRegistrationResult;
import art.yesulin.application.account.ProducerRegistrationResult;
import art.yesulin.domain.account.Email;
import art.yesulin.infrastructure.company.CompanyJpaEntity;
import art.yesulin.infrastructure.company.CompanyJpaRepository;
import art.yesulin.infrastructure.company.CompanyMemberJpaEntity;
import art.yesulin.infrastructure.company.CompanyMemberJpaRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountRegistrationServiceAdapter implements AccountRegistrationService {

    private final AccountJpaRepository accountRepository;
    private final ApplicantJpaRepository applicantRepository;
    private final CompanyJpaRepository companyRepository;
    private final CompanyMemberJpaRepository companyMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public AccountRegistrationServiceAdapter(
            AccountJpaRepository accountRepository,
            ApplicantJpaRepository applicantRepository,
            CompanyJpaRepository companyRepository,
            CompanyMemberJpaRepository companyMemberRepository,
            PasswordEncoder passwordEncoder,
            Clock clock) {
        this.accountRepository = accountRepository;
        this.applicantRepository = applicantRepository;
        this.companyRepository = companyRepository;
        this.companyMemberRepository = companyMemberRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional
    @Override
    public ApplicantRegistrationResult registerApplicant(String rawEmail, String rawPassword) {
        AccountJpaEntity account = createAccount(rawEmail, rawPassword);
        ApplicantJpaEntity applicant = applicantRepository.save(
                ApplicantJpaEntity.create(account.id(), now()));
        return new ApplicantRegistrationResult(account.id(), applicant.id(), account.email());
    }

    @Transactional
    @Override
    public ProducerRegistrationResult registerProducer(
            String rawEmail,
            String rawPassword,
            String companyName,
            String businessNumber,
            String representativeName,
            String contactName) {
        AccountJpaEntity account = createAccount(rawEmail, rawPassword);
        CompanyJpaEntity company = companyRepository.save(CompanyJpaEntity.create(
                companyName, businessNumber, representativeName, contactName, account.email(), now()));
        companyMemberRepository.save(
                CompanyMemberJpaEntity.createAdmin(account.id(), company.id(), now()));
        return new ProducerRegistrationResult(
                account.id(), company.id(), account.email(), company.verificationStatus());
    }

    private AccountJpaEntity createAccount(String rawEmail, String rawPassword) {
        Email email = Email.of(rawEmail);
        if (accountRepository.existsByEmail(email.value())) {
            throw new AccountConflictException();
        }
        return accountRepository.save(AccountJpaEntity.create(
                email.value(), passwordEncoder.encode(rawPassword), now()));
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
