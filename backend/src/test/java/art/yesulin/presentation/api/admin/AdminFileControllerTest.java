package art.yesulin.presentation.api.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-files;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminFileControllerTest {

    private static final String PATH = "/api/v1/admin/files/unreferenced";
    private static final MemberPrincipal ADMIN = new MemberPrincipal(99L, MemberType.ADMIN, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanUp() {
        jdbcTemplate.update("delete from file_assets");
    }

    @Test
    void listsRecentAndOldUnusedFilesWithDifferentClocks() throws Exception {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        insertFile(901L, "PENDING", now.minus(8, ChronoUnit.DAYS), null);
        insertFile(902L, "READY", now.minus(30, ChronoUnit.DAYS), now.minus(1, ChronoUnit.DAYS));

        // when
        mockMvc.perform(get(PATH).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                // then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files.length()").value(2))
                .andExpect(jsonPath("$.files[0].fileId").value(901))
                .andExpect(jsonPath("$.files[0].deletable").value(true))
                .andExpect(jsonPath("$.files[1].fileId").value(902))
                .andExpect(jsonPath("$.files[1].deletable").value(false));
    }

    @Test
    void rejectsNonAdmin() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(1L, MemberType.APPLICANT, MemberStatus.ACTIVE);

        mockMvc.perform(get(PATH).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant))
                .andExpect(status().isForbidden());
    }

    private void insertFile(long id, String status, Instant createdAt, Instant unreferencedAt) {
        jdbcTemplate.update("""
                insert into file_assets
                    (id, object_key, owner_id, original_filename, content_type, file_type, size,
                     status, created_at, unreferenced_at)
                values (?, ?, 1, 'photo.png', 'image/png', 'IMAGE', 10, ?, ?, ?)
                """, id, "private/actor-photos/" + id, status, Timestamp.from(createdAt),
                unreferencedAt == null ? null : Timestamp.from(unreferencedAt));
    }
}
