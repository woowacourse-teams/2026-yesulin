package art.yesulin.auditionpost.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class AuditionPostReviewStatusMigrationTest {

    @Test
    void splitsHiddenPostsAndRecordsHowEachPostWasCreated() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:audition-post-review-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", ""
        );
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20261012220000")).load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        // 자동으로 가져와 아직 공개하지 않은 공고
        insertPost(jdbc, 1, "OTR", "101", null, "HIDDEN");
        // 운영자가 처음 가져와 공개했다가 내린 공고
        insertPost(jdbc, 2, "OTR", "102", 7L, "HIDDEN");
        audit(jdbc, 2, "AUDITION_POST_IMPORTED", "OTR 102 처음 가져옴");
        audit(jdbc, 2, "AUDITION_POST_STATUS_CHANGED", "HIDDEN → PUBLISHED");
        audit(jdbc, 2, "AUDITION_POST_STATUS_CHANGED", "PUBLISHED → HIDDEN");
        // 자동으로 가져온 뒤 운영자가 다시 가져와 공개한 공고
        insertPost(jdbc, 3, "OTR", "103", 7L, "PUBLISHED");
        audit(jdbc, 3, "AUDITION_POST_IMPORTED", "OTR 103 원문으로 다시 가져옴");
        // 운영자가 직접 써서 아직 공개하지 않은 공고와 기획사가 올린 공고
        insertPost(jdbc, 4, "YESULIN", null, 7L, "HIDDEN");
        insertPost(jdbc, 5, "YESULIN", null, null, "PUBLISHED");
        Flyway flyway = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20261013120000")).load();

        assertEquals(1, flyway.migrate().migrationsExecuted);

        assertEquals(
                List.of(
                        "1 PENDING AUTO_IMPORT",
                        "2 HIDDEN ADMIN_IMPORT",
                        "3 PUBLISHED AUTO_IMPORT",
                        "4 PENDING ADMIN_WRITE",
                        "5 PUBLISHED PRODUCER_WRITE"
                ),
                jdbc.queryForList(
                        "select concat(id, ' ', status, ' ', created_via) from audition_posts order by id", String.class
                )
        );
        assertEquals(0, flyway.migrate().migrationsExecuted);
    }

    private static void insertPost(JdbcTemplate jdbc, long id, String source, String externalId, Long importedBy,
            String status) {
        jdbc.update("""
                insert into audition_posts
                    (id, source, external_id, source_url, category, title, pay, deadline_text, author_name,
                     body_html, status, imported_by, created_at, updated_at)
                values (?, ?, ?, ?, '연극', '공고', '', '', '', '', ?, ?, current_timestamp, current_timestamp)
                """, id, source, externalId, externalId == null ? null : "https://otr.co.kr/audition/?vid=" + externalId,
                status, importedBy);
    }

    private static void audit(JdbcTemplate jdbc, long postId, String action, String detail) {
        jdbc.update("""
                insert into admin_audit_logs (actor_member_id, action, target_type, target_id, detail, created_at)
                values (7, ?, 'AUDITION_POST', ?, ?, current_timestamp)
                """, action, postId, detail);
    }
}
