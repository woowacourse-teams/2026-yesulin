package art.yesulin.application.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.application.draft.DraftAttachmentService;
import art.yesulin.domain.application.BasicInformation;
import art.yesulin.domain.application.ConsentEvidence;
import art.yesulin.domain.application.Gender;
import art.yesulin.infrastructure.account.AccountJpaEntity;
import art.yesulin.infrastructure.account.AccountJpaRepository;
import art.yesulin.infrastructure.account.ApplicantJpaEntity;
import art.yesulin.infrastructure.account.ApplicantJpaRepository;
import art.yesulin.infrastructure.application.ApplicationJpaRepository;
import art.yesulin.infrastructure.company.CompanyJpaEntity;
import art.yesulin.infrastructure.company.CompanyJpaRepository;
import art.yesulin.infrastructure.draft.DraftJpaEntity;
import art.yesulin.infrastructure.draft.DraftJpaRepository;
import art.yesulin.infrastructure.recruitment.PerformanceJpaEntity;
import art.yesulin.infrastructure.recruitment.PerformanceJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import art.yesulin.infrastructure.recruitment.RoleJpaEntity;
import art.yesulin.infrastructure.recruitment.RoleJpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

@SpringBootTest
@Testcontainers
class ApplicationSubmissionServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 12, 3, 0);

    @Container
    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("yesulin")
            .withUsername("yesulin")
            .withPassword("yesulin-test");

    @Autowired
    private ApplicationSubmissionService submissionService;

    @Autowired
    private DraftAttachmentService draftAttachmentService;

    @Autowired
    private AccountJpaRepository accountRepository;

    @Autowired
    private ApplicantJpaRepository applicantRepository;

    @Autowired
    private CompanyJpaRepository companyRepository;

    @Autowired
    private PerformanceJpaRepository performanceRepository;

    @Autowired
    private PostingJpaRepository postingRepository;

    @Autowired
    private RoleJpaRepository roleRepository;

    @Autowired
    private PostingFieldJpaRepository fieldRepository;

    @Autowired
    private DraftJpaRepository draftRepository;

    @Autowired
    private ApplicationJpaRepository applicationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long accountId;
    private long postingId;
    private long roleId;
    private long draftId;

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @BeforeEach
    void setUp() {
        resetDatabase();
        AccountJpaEntity account = accountRepository.save(
                AccountJpaEntity.create("submit@example.com", "hash", NOW));
        accountId = account.id();
        applicantRepository.save(ApplicantJpaEntity.create(accountId, NOW));
        CompanyJpaEntity company = companyRepository.save(CompanyJpaEntity.create(
                "공연사", null, null, "담당자", "producer@example.com", NOW));
        PerformanceJpaEntity performance = performanceRepository.save(PerformanceJpaEntity.create(
                null, company.id(), "공연", null, null, NOW));
        PostingJpaEntity posting = postingRepository.save(PostingJpaEntity.create(
                null, performance.id(), "공고", "OPEN", true,
                LocalDateTime.of(2020, 1, 1, 0, 0),
                LocalDateTime.of(2030, 1, 1, 0, 0), null, NOW));
        postingId = posting.id();
        RoleJpaEntity role = roleRepository.save(RoleJpaEntity.create(
                null, postingId, "자유", null, 1, null, null, null, NOW));
        roleId = role.id();
        fieldRepository.save(PostingFieldJpaEntity.create(
                postingId, null, "CUSTOM", "질문", "TEXT", false,
                true, "CUSTOM", 1, "{}"));
        DraftJpaEntity draft = draftRepository.save(DraftJpaEntity.createOwned(
                postingId, accountId, "{\"name\":\"지원자\"}", NOW, NOW));
        draftId = draft.id();
    }

    private void resetDatabase() {
        jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 0");
        for (String table : List.of(
                "application_reviews", "screening_rounds", "consent_snapshots",
                "application_snapshots", "application_answers",
                "application_roles", "applications", "drafts", "posting_fields", "roles", "postings",
                "performances", "company_members", "companies", "applicant_profiles",
                "applicants", "accounts")) {
            jdbcTemplate.execute("TRUNCATE TABLE " + table);
        }
        jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS = 1");
    }

    @Test
    @DisplayName("지원서와 배역·답변·스냅샷·동의를 저장하고 Draft를 제출 확정한다")
    void persistsImmutableSubmissionEvidence() {
        // when
        SubmissionResult result = submissionService.submit(accountId, validCommand("{\"value\":\"답변\"}"));

        // then
        assertThat(result.postingId()).isEqualTo(postingId);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM application_roles WHERE application_id = ?",
                Integer.class, result.applicationId())).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM application_snapshots WHERE application_id = ?",
                Integer.class, result.applicationId())).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT snapshot_json FROM application_snapshots WHERE application_id = ?",
                String.class, result.applicationId()))
                .contains("공고", "application-consent-v1", "질문")
                .doesNotContain("조작한 질문", "1.0-draft");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM consent_snapshots WHERE application_id = ?",
                Integer.class, result.applicationId())).isEqualTo(2);
        assertThat(jdbcTemplate.queryForList(
                "SELECT consent_type, document_version, disclosure_json "
                        + "FROM consent_snapshots WHERE application_id = ? ORDER BY consent_type",
                result.applicationId()))
                .allSatisfy(row -> {
                    assertThat(row.get("document_version")).isEqualTo("application-consent-v1");
                    assertThat(row.get("disclosure_json").toString())
                            .contains("공연사", "공고", "purpose", "retention");
                });
        assertThat(draftRepository.findById(draftId).orElseThrow().status()).isEqualTo("SUBMITTED");
    }

    @Test
    @DisplayName("제출 중 DB 저장이 실패하면 지원서와 Draft 변경을 모두 롤백한다")
    void rollsBackWholeSubmissionTransaction() {
        // when & then
        assertThatThrownBy(() -> submissionService.submit(accountId, validCommand("not-json")))
                .isInstanceOf(RuntimeException.class);
        assertThat(applicationRepository.count()).isZero();
        assertThat(draftRepository.findById(draftId).orElseThrow().status()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("같은 공고의 Draft를 계정에 연결하면 더 최신인 전체 Draft 하나만 남긴다")
    void keepsNewerWholeDraftWhenAttaching() {
        DraftJpaEntity incoming = draftRepository.save(DraftJpaEntity.createOwned(
                postingId, null, "{\"name\":\"더 최신\"}",
                NOW.plusMinutes(1), NOW.plusMinutes(1)));

        draftAttachmentService.attachVerifiedDraft(incoming.id(), accountId);

        DraftJpaEntity merged = draftRepository
                .findByAccountIdAndPostingId(accountId, postingId).orElseThrow();
        assertThat(merged.id()).isEqualTo(incoming.id());
        assertThat(merged.contentJson()).contains("더 최신");
        assertThat(draftRepository.count()).isEqualTo(1);
    }

    private SubmitApplicationCommand validCommand(String answerJson) {
        BasicInformation information = new BasicInformation(
                "지원자", 170, 60, LocalDate.of(2000, 1, 1), Gender.NOT_DISCLOSED,
                "010-0000-0000", "submit@example.com", "서울");
        ConsentEvidence consents = new ConsentEvidence(
                true, true, false, "1.0-draft", "{\"company\":\"공연사\"}");
        return new SubmitApplicationCommand(
                draftId,
                postingId,
                information,
                List.of(roleId),
                List.of(new SubmissionAnswer("CUSTOM", "조작한 질문", answerJson, 99)),
                consents);
    }
}
