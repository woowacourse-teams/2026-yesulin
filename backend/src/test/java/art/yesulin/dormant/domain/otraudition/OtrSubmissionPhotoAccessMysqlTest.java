package art.yesulin.dormant.domain.otraudition;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.dormant.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.dormant.domain.submission.SubmissionBasicInformation;
import art.yesulin.dormant.domain.submission.SubmissionGender;
import art.yesulin.infrastructure.querydsl.QueryDslConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(QueryDslConfiguration.class)
@EnabledIf("dockerAvailable")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OtrSubmissionPhotoAccessMysqlTest {

    private static final MysqlContainer MYSQL = new MysqlContainer();
    private static final long OWNER_ID = 20L;
    private static final long FILE_ID = 41L;

    @Autowired
    private OtrAuditionRepository auditionRepository;
    @Autowired
    private OtrSubmissionRepository submissionRepository;

    static boolean dockerAvailable() {
        return DockerClientFactory.instance().isDockerAvailable();
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        MYSQL.start();
        registry.add("spring.datasource.url", () -> "jdbc:mysql://"
                + MYSQL.getHost() + ":" + MYSQL.getMappedPort(3306) + "/photo_access");
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.datasource.username", () -> "test");
        registry.add("spring.datasource.password", () -> "test");
    }

    @AfterAll
    static void stopDatabase() {
        MYSQL.stop();
    }

    @Test
    void identifiesSubmittedPhotosOnMysql() {
        createSubmission(List.of(FILE_ID, FILE_ID + 1));

        assertTrue(submissionRepository.existsSubmittedPhoto(FILE_ID));
        assertTrue(submissionRepository.existsSubmittedPhoto(FILE_ID + 1));
        assertFalse(submissionRepository.existsSubmittedPhoto(FILE_ID + 2));
    }

    @Test
    void permitsOnlyTheAuditionOwnerOnMysql() {
        createSubmission(List.of(FILE_ID));

        assertTrue(submissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID, OWNER_ID));
        assertFalse(submissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID, OWNER_ID + 1));
        assertFalse(submissionRepository.existsSubmittedPhotoOwnedByProducer(FILE_ID + 1, OWNER_ID));
    }

    private void createSubmission(List<Long> photos) {
        OtrAudition audition = auditionRepository.saveAndFlush(new OtrAudition(
                OWNER_ID, "12345", "테스트 공고", List.of("배역"), LocalDate.of(2026, 10, 7)));
        SubmissionBasicInformation basic = new SubmissionBasicInformation(
                "테스트 배우", 170, 60, LocalDate.of(2000, 1, 1), SubmissionGender.MALE,
                "010-1234-5678", "actor@example.com", "서울특별시 종로구");
        SubmissionAdditionalInformation additional = new SubmissionAdditionalInformation(
                null, List.of(), null, null, null, null, null, List.of());
        submissionRepository.saveAndFlush(new OtrSubmission(
                audition.getId(), 10L, "배역", basic, additional, photos, List.of(),
                "테스트 제작사", "privacy-v1", "third-party-v1", Instant.parse("2026-09-30T00:00:00Z")));
    }

    private static class MysqlContainer extends GenericContainer<MysqlContainer> {

        MysqlContainer() {
            super("mysql:8.4");
            withEnv("MYSQL_ROOT_PASSWORD", "test-root");
            withEnv("MYSQL_DATABASE", "photo_access");
            withEnv("MYSQL_USER", "test");
            withEnv("MYSQL_PASSWORD", "test");
            withExposedPorts(3306);
            waitingFor(Wait.forLogMessage(".*ready for connections.*port: 3306.*\\n", 1));
        }
    }
}
