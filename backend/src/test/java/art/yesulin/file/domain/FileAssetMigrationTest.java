package art.yesulin.file.domain;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class FileAssetMigrationTest {

    @Test
    void indexesDirectShowReferencesUsedByUnusedFileReport() throws SQLException {
        String url = "jdbc:h2:mem:file-report-indexes-" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url, "sa", "");
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();

        assertTrue(indexNames(dataSource, "SHOWS").contains("IDX_SHOWS_POSTER_FILE_ID"));
        assertTrue(indexNames(dataSource, "SHOW_IMAGES").contains("IDX_SHOW_IMAGES_FILE_ID"));
    }

    @Test
    void givesExistingFilesTheMigrationTimeInsteadOfTreatingThemAsOld() {
        String url = "jdbc:h2:mem:file-asset-migration-" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url, "sa", "");
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20260930101000"))
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

    private Set<String> indexNames(DriverManagerDataSource dataSource, String table) throws SQLException {
        Set<String> names = new HashSet<>();
        try (Connection connection = dataSource.getConnection();
                ResultSet indexes = connection.getMetaData().getIndexInfo(null, null, table, false, false)) {
            while (indexes.next()) {
                names.add(indexes.getString("INDEX_NAME"));
            }
        }
        return names;
    }
}
