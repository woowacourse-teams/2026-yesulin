package art.yesulin.infrastructure.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-migration;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true"
})
@Import(ObjectStorageTestConfiguration.class)
class ScreeningSubmissionMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsScreeningSubmissionSnapshotTables() {
        Integer tableCount = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.tables
                where table_name = 'SCREENING_SUBMISSION_SNAPSHOTS'
                """, Integer.class);

        assertEquals(1, tableCount);
    }
}
