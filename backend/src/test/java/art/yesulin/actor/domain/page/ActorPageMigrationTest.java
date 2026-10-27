package art.yesulin.actor.domain.page;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
        "spring.datasource.url=jdbc:h2:mem:actor-page-migration;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class ActorPageMigrationTest {

    @Autowired
    private Flyway flyway;

    @Test
    void appliesMigrationToEmptyDatabaseAndValidatesJpaSchema() {
        assertEquals("20261027150000", flyway.info().current().getVersion().getVersion());
    }

    @Test
    void existingPhotosAndVideosReceivePrivateAndProducerDefaults() {
        String url = "jdbc:h2:mem:actor-page-upgrade-" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration")
                .target("20261027140000").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(url, "sa", ""));
        jdbc.update("""
                insert into members (id, type, status, created_at)
                values (1, 'APPLICANT', 'ACTIVE', current_timestamp)
                """);
        jdbc.update("""
                insert into file_assets
                    (id, object_key, owner_id, original_filename, content_type, file_type, size, status, created_at)
                values (1, 'private/actor-photos/test', 1, 'a.jpg', 'image/jpeg', 'ACTOR_PHOTO', 10, 'READY', current_timestamp)
                """);
        jdbc.update("insert into photo_libraries (id, owner_id) values (1, 1)");
        jdbc.update("insert into photo_library_items (photo_library_id, file_id, display_order) values (1, 1, 0)");
        jdbc.update("insert into video_libraries (id, owner_id) values (1, 1)");
        jdbc.update("""
                insert into video_library_items (video_library_id, url, youtube_id, display_order)
                values (1, 'https://youtu.be/aqz-KE-bpKQ', 'aqz-KE-bpKQ', 0)
                """);
        Flyway.configure().dataSource(url, "sa", "").locations("classpath:db/migration").load().migrate();
        assertEquals("PRIVATE", jdbc.queryForObject("select visibility from photo_library_items", String.class));
        assertEquals("PRODUCER", jdbc.queryForObject("select visibility from video_library_items", String.class));
    }
}
