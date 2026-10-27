package art.yesulin.actor.domain.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:profile-career-migration;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class ProfileCareerGenreMigrationTest {

    @Autowired
    private Flyway flyway;

    @Test
    void appliesMigrationToEmptyDatabaseAndValidatesJpaSchema() {
        assertTrue(flyway.info().current().getVersion().isAtLeast("20261027170000"));
        assertEquals(0, flyway.info().pending().length);
    }

    @Test
    void existingCareerRowsRemainUnclassified() {
        String url = "jdbc:h2:mem:profile-career-upgrade-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration")
                .target("20261027160000").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(url, "sa", ""));
        jdbc.update("""
                insert into members (id, type, status, created_at)
                values (1, 'APPLICANT', 'ACTIVE', current_timestamp)
                """);
        jdbc.update("""
                insert into applicant_profiles (id, owner_id, created_at, updated_at)
                values (1, 1, current_timestamp, current_timestamp)
                """);
        jdbc.update("""
                insert into applicant_profile_careers (applicant_profile_id, career_order, career_year, title, role_name)
                values (1, 0, 2026, '기존 작품', '기존 배역')
                """);
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration").load().migrate();
        assertNull(jdbc.queryForObject("select genre from applicant_profile_careers", String.class));
        assertEquals("기존 작품", jdbc.queryForObject("select title from applicant_profile_careers", String.class));
    }
}
