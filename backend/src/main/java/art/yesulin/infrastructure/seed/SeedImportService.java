package art.yesulin.infrastructure.seed;

import art.yesulin.infrastructure.account.AccountJpaEntity;
import art.yesulin.infrastructure.account.AccountJpaRepository;
import art.yesulin.infrastructure.company.CompanyJpaEntity;
import art.yesulin.infrastructure.company.CompanyJpaRepository;
import art.yesulin.infrastructure.company.CompanyMemberJpaEntity;
import art.yesulin.infrastructure.company.CompanyMemberJpaRepository;
import art.yesulin.infrastructure.recruitment.PerformanceJpaEntity;
import art.yesulin.infrastructure.recruitment.PerformanceJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import art.yesulin.infrastructure.recruitment.RoleJpaEntity;
import art.yesulin.infrastructure.recruitment.RoleJpaRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SeedImportService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final AccountJpaRepository accountRepository;
    private final CompanyJpaRepository companyRepository;
    private final CompanyMemberJpaRepository memberRepository;
    private final PerformanceJpaRepository performanceRepository;
    private final PostingJpaRepository postingRepository;
    private final RoleJpaRepository roleRepository;
    private final PostingFieldJpaRepository fieldRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public SeedImportService(
            AccountJpaRepository accountRepository,
            CompanyJpaRepository companyRepository,
            CompanyMemberJpaRepository memberRepository,
            PerformanceJpaRepository performanceRepository,
            PostingJpaRepository postingRepository,
            RoleJpaRepository roleRepository,
            PostingFieldJpaRepository fieldRepository,
            PasswordEncoder passwordEncoder,
            Clock clock) {
        this.accountRepository = accountRepository;
        this.companyRepository = companyRepository;
        this.memberRepository = memberRepository;
        this.performanceRepository = performanceRepository;
        this.postingRepository = postingRepository;
        this.roleRepository = roleRepository;
        this.fieldRepository = fieldRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional
    public SeedImportResult importSeed(SeedData seed, String producerPassword) {
        if (producerPassword == null || producerPassword.length() < 8) {
            throw new SeedValidationException("시드 공연사 비밀번호는 8자 이상이어야 합니다.");
        }
        LocalDateTime now = now();
        SeedData.Producer producer = seed.producer();
        AccountJpaEntity account = accountRepository.findByEmail(producer.email())
                .orElseGet(() -> accountRepository.save(AccountJpaEntity.create(
                        producer.email(), passwordEncoder.encode(producerPassword), now)));
        String companySourceId = "company:" + producer.businessNumber();
        CompanyJpaEntity company = companyRepository.findBySourceId(companySourceId)
                .orElseGet(() -> companyRepository.save(CompanyJpaEntity.importVerified(
                        companySourceId, producer.companyName(), producer.businessNumber(),
                        producer.representativeName(), producer.contactName(), producer.email(),
                        producer.verifiedAtUtc(), now)));
        if (!memberRepository.existsByAccountIdAndCompanyId(account.id(), company.id())) {
            memberRepository.save(CompanyMemberJpaEntity.createAdmin(account.id(), company.id(), now));
        }

        Map<String, Long> performanceIds = importPerformances(seed, company.id(), now);
        Map<String, Long> postingIds = importPostings(seed, performanceIds, now);
        importRoles(seed, postingIds, now);
        importFields(seed, postingIds, now);
        return new SeedImportResult(
                companyRepository.count(), performanceRepository.count(), postingRepository.count(),
                roleRepository.count(), fieldRepository.count());
    }

    private Map<String, Long> importPerformances(
            SeedData seed, long companyId, LocalDateTime now) {
        Map<String, Long> ids = new HashMap<>();
        for (SeedData.Performance item : seed.performances()) {
            PerformanceJpaEntity entity = performanceRepository.findBySourceId(item.sourceId())
                    .orElseGet(() -> performanceRepository.save(PerformanceJpaEntity.create(
                            item.sourceId(), companyId, item.title(), item.venue(),
                            item.posterUrl(), now)));
            if (entity.companyId() != companyId) {
                throw new SeedValidationException("공연 원본 ID가 다른 공연사에 이미 연결되어 있습니다.");
            }
            ids.put(item.sourceId(), entity.id());
        }
        return ids;
    }

    private Map<String, Long> importPostings(
            SeedData seed, Map<String, Long> performanceIds, LocalDateTime now) {
        Map<String, Long> ids = new HashMap<>();
        for (SeedData.Posting item : seed.postings()) {
            long performanceId = performanceIds.get(item.performanceSourceId());
            PostingJpaEntity entity = postingRepository.findBySourceId(item.sourceId())
                    .orElseGet(() -> postingRepository.save(PostingJpaEntity.create(
                            item.sourceId(), performanceId, item.title(), item.status(), false,
                            startUtc(item), endExclusiveUtc(item), item.applicationGuide(), now)));
            if (entity.performanceId() != performanceId) {
                throw new SeedValidationException("공고 원본 ID가 다른 공연에 이미 연결되어 있습니다.");
            }
            ids.put(item.sourceId(), entity.id());
        }
        return ids;
    }

    private void importRoles(
            SeedData seed, Map<String, Long> postingIds, LocalDateTime now) {
        for (SeedData.Role item : seed.roles()) {
            long postingId = postingIds.get(item.postingSourceId());
            RoleJpaEntity entity = roleRepository.findBySourceId(item.sourceId())
                    .orElseGet(() -> roleRepository.save(RoleJpaEntity.create(
                            item.sourceId(), postingId, item.name(), item.description(), item.quota(),
                            item.gender(), item.ageMin(), item.ageMax(), now)));
            if (entity.postingId() != postingId) {
                throw new SeedValidationException("배역 원본 ID가 다른 공고에 이미 연결되어 있습니다.");
            }
        }
    }

    private void importFields(
            SeedData seed, Map<String, Long> postingIds, LocalDateTime now) {
        for (SeedData.PostingField item : seed.postingFields()) {
            long postingId = postingIds.get(item.postingSourceId());
            fieldRepository.findByPostingIdAndFieldKey(postingId, item.key())
                    .orElseGet(() -> fieldRepository.save(PostingFieldJpaEntity.create(
                            postingId, item.sourceId(), item.key(), item.label(), item.inputType(),
                            item.required(), item.custom(), item.section(), item.order(),
                            item.configJson())));
        }
    }

    private LocalDateTime startUtc(SeedData.Posting posting) {
        return LocalDateTime.ofInstant(
                posting.recruitmentStart().atStartOfDay(SEOUL).toInstant(), ZoneOffset.UTC);
    }

    private LocalDateTime endExclusiveUtc(SeedData.Posting posting) {
        return LocalDateTime.ofInstant(
                posting.recruitmentEnd().plusDays(1).atStartOfDay(SEOUL).toInstant(), ZoneOffset.UTC);
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
