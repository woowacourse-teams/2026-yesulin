package art.yesulin.domain.show;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class ShowExternalReservationMigrationTest {

    @Test
    void upgradesMergedDevWithoutChangingProducerBookingsOrAuditionRedirectCounts() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:show-external-migration-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
                "sa", ""
        );
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20261007120000")).load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        insertExistingData(jdbc);
        Flyway flyway = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load();

        assertEquals(1, flyway.migrate().migrationsExecuted);
        flyway.validate();

        assertEquals("", jdbc.queryForObject("select external_reservation_url from shows where id = 1", String.class));
        assertEquals(10, jdbc.queryForObject("select capacity from show_sessions where id = 1", Integer.class));
        assertEquals(2, jdbc.queryForObject("select ticket_count from reservations where id = 1", Integer.class));
        assertEquals("기존 메모", jdbc.queryForObject("select memo from reservations where id = 1", String.class));
        assertEquals(7L, jdbc.queryForObject("select redirect_count from audition_posts where id = 1", Long.class));
        jdbc.update("insert into show_external_reservation_visits (show_id) values (1)");
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("insert into show_external_reservation_visits (show_id) values (999)"));
        assertEquals(0, flyway.migrate().migrationsExecuted);
    }

    private static void insertExistingData(JdbcTemplate jdbc) {
        jdbc.update("""
                insert into shows
                    (id, public_id, owner_id, title, genre, description, venue_name, road_address, detail_address,
                     zonecode, running_minutes, age_rating, inquiry_phone, poster_file_id, status, host_name)
                values (1, 'migration-show', 1, '기존 공연', 'PLAY', '', '기존 공연장', '서울 종로구 대학로 12', '',
                        '', 90, '', '02-123-4567', 1, 'OPEN', '기존 주최')
                """);
        jdbc.update("""
                insert into show_sessions (id, show_id, starts_at, capacity)
                values (1, 1, '2026-11-07 19:30:00', 10)
                """);
        jdbc.update("""
                insert into reservations
                    (id, code, session_id, booker_name, booker_phone, ticket_count,
                     privacy_document_version, status, memo)
                values (1, 'TEST0001', 1, '검증', '010-1234-5678', 2, 'v1', 'CONFIRMED', '기존 메모')
                """);
        jdbc.update("""
                insert into audition_posts
                    (id, source, external_id, source_url, category, title, pay, deadline_text, author_name,
                     body_html, status, redirect_count, created_at, updated_at)
                values (1, 'OTR', 'migration-test', 'https://example.com', '연극', '기존 공고', '', '', '',
                        '', 'OPEN', 7, current_timestamp, current_timestamp)
                """);
    }
}
