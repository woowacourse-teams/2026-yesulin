package art.yesulin.domain.file;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class FileAssetMigrationTest {

    @Test
    void givesExistingFilesTheMigrationTimeInsteadOfTreatingThemAsOld() {
        String url = "jdbc:h2:mem:file-asset-migration-" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url, "sa", "");
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20260925160000"))
                .load()
                .migrate();
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.update("""
                insert into file_assets
                    (object_key, owner_id, original_filename, content_type, file_type, size, status)
                values (?, ?, ?, ?, ?, ?, ?)
                """, "public/files/20260801/legacy", 1L, "legacy.png", "image/png", "IMAGE", 10L, "READY");

        Instant beforeMigration = Instant.now();
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        Instant afterMigration = Instant.now();

        Timestamp createdAt = jdbcTemplate.queryForObject(
                "select created_at from file_assets where object_key = ?",
                Timestamp.class,
                "public/files/20260801/legacy"
        );
        assertFalse(createdAt.toInstant().isBefore(beforeMigration));
        assertFalse(createdAt.toInstant().isAfter(afterMigration));
    }
}
