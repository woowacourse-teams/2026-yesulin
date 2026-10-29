package art.yesulin.event.domain.registration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class EventBusinessCardMigrationTest {

    @Test
    void backfillsOnlyRequestedCardsAndKeepsKeysAfterRerun() {
        DriverManagerDataSource source = new DriverManagerDataSource(
                "jdbc:h2:mem:card-migration-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", ""
        );
        Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20261029120000")).load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(source);
        for (int id = 1; id <= 3; id++) {
            jdbc.update("""
                    insert into event_registrations
                        (id, event_id, participant_type, name, phone, business_card_requested, created_at)
                    values (?, 1, 'ACTOR', '참가자', ?, ?, current_timestamp)
                    """, id, "010-0000-000" + id, id < 3);
        }
        Flyway flyway = Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20261029130100")).load();

        assertEquals(2, flyway.migrate().migrationsExecuted);
        String first = jdbc.queryForObject(
                "select business_card_key from event_registrations where id = 1", String.class);
        String second = jdbc.queryForObject(
                "select business_card_key from event_registrations where id = 2", String.class);
        assertEquals(4, UUID.fromString(first).version());
        assertEquals(4, UUID.fromString(second).version());
        assertNull(jdbc.queryForObject("select business_card_key from event_registrations where id = 3", String.class));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("update event_registrations set business_card_key = ? where id = 2", first));
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertEquals(first, jdbc.queryForObject(
                "select business_card_key from event_registrations where id = 1", String.class));
    }
}
