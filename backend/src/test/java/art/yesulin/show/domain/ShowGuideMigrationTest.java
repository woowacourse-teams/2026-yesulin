package art.yesulin.show.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class ShowGuideMigrationTest {

    @Test
    void movesExistingDirectionsNoteIntoFirstGuideAndStartsWithDefaultHostName() {
        String url = "jdbc:h2:mem:show-guide-migration-" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1";
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url, "sa", "");
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(MigrationVersion.fromVersion("20260930112000"))
                .load()
                .migrate();
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        final long withNote = insertShow(jdbcTemplate, "혜화역 2번 출구에서 도보 5분\n오른쪽 골목 입구");
        insertShow(jdbcTemplate, "");

        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();

        List<Map<String, Object>> guides = jdbcTemplate.queryForList(
                "select show_id, guide_order, title, content from show_guides"
        );
        assertEquals(1, guides.size());
        assertEquals(withNote, ((Number) guides.getFirst().get("SHOW_ID")).longValue());
        assertEquals(0, ((Number) guides.getFirst().get("GUIDE_ORDER")).intValue());
        assertEquals("추가 안내", guides.getFirst().get("TITLE"));
        assertEquals("혜화역 2번 출구에서 도보 5분\n오른쪽 골목 입구", guides.getFirst().get("CONTENT"));
        assertEquals(List.of(""), jdbcTemplate.queryForList("select distinct host_name from shows", String.class));
    }

    private static long insertShow(JdbcTemplate jdbcTemplate, String directionsNote) {
        String publicId = UUID.randomUUID().toString();
        jdbcTemplate.update("""
                insert into shows
                    (public_id, owner_id, title, genre, description, venue_name, road_address, detail_address,
                     zonecode, running_minutes, age_rating, inquiry_phone, poster_file_id, status, directions_note)
                values (?, 1, '햄릿', 'PLAY', '', '예술인 소극장', '서울특별시 종로구 대학로 12', '', '', 100, '',
                        '02-123-4567', 1, 'OPEN', ?)
                """, publicId, directionsNote);
        return jdbcTemplate.queryForObject("select id from shows where public_id = ?", Long.class, publicId);
    }
}
