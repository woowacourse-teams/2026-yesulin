package art.yesulin.infrastructure.seed;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.infrastructure.account.AccountJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import java.net.URISyntaxException;
import java.nio.file.Path;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

@SpringBootTest
@Testcontainers
class SeedImportServiceTest {

    @Container
    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("yesulin")
            .withUsername("yesulin")
            .withPassword("yesulin");

    private final SeedFileReader reader;
    private final SeedImportService importService;
    private final PostingJpaRepository postingRepository;
    private final AccountJpaRepository accountRepository;

    @Autowired
    SeedImportServiceTest(
            SeedFileReader reader,
            SeedImportService importService,
            PostingJpaRepository postingRepository,
            AccountJpaRepository accountRepository) {
        this.reader = reader;
        this.importService = importService;
        this.postingRepository = postingRepository;
        this.accountRepository = accountRepository;
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Test
    void importsValidatedSeedIdempotently() throws URISyntaxException {
        Path path = Path.of(requireResource("/seed/valid-seed.json").toURI());
        SeedData seed = reader.read(path);

        SeedImportResult first = importService.importSeed(seed, "test-password");
        SeedImportResult second = importService.importSeed(seed, "test-password");

        assertThat(first).isEqualTo(new SeedImportResult(1, 1, 1, 1, 1));
        assertThat(second).isEqualTo(first);
        assertThat(postingRepository.findBySourceId("po1")).hasValueSatisfying(posting -> {
            assertThat(posting.recruitmentStartsAt())
                    .isEqualTo(LocalDateTime.of(2026, 7, 31, 15, 0));
            assertThat(posting.recruitmentEndsAt())
                    .isEqualTo(LocalDateTime.of(2026, 8, 9, 15, 0));
        });
        assertThat(accountRepository.findByEmail("seed@yesulin.example"))
                .hasValueSatisfying(account -> assertThat(account.passwordHash())
                        .isNotEqualTo("test-password")
                        .startsWith("$2"));
    }

    private java.net.URL requireResource(String name) {
        java.net.URL resource = getClass().getResource(name);
        if (resource == null) {
            throw new SeedValidationException("테스트 시드 리소스가 없습니다: " + name);
        }
        return resource;
    }
}
