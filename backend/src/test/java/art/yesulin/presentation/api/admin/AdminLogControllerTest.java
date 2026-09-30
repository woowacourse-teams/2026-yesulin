package art.yesulin.presentation.api.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-log-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "logging.file.name=build/tmp/admin-log-api-test.log"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminLogControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @BeforeAll
    static void writeLogFile() throws IOException {
        Path path = Path.of("build/tmp/admin-log-api-test.log");
        Files.createDirectories(path.getParent());
        Files.writeString(path, "INFO started\nWARN Disk Full\ninfo stopped\n", StandardCharsets.UTF_8);
        Path archive = Path.of("build/tmp/admin-log-api-test.log.2026-01-02.0.gz");
        try (OutputStream output = new GZIPOutputStream(Files.newOutputStream(archive))) {
            output.write("INFO archived first\nINFO archived second\n".getBytes(StandardCharsets.UTF_8));
        }
    }

    @Test
    void readsArchivedLogOfRequestedDate() throws Exception {
        mockMvc.perform(get("/api/v1/admin/logs")
                        .param("date", "2026-01-02")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.lines.length()").value(2))
                .andExpect(jsonPath("$.lines[1]").value("INFO archived second"));
    }

    @Test
    void rejectsMalformedDate() throws Exception {
        mockMvc.perform(get("/api/v1/admin/logs")
                        .param("date", "2026-13-40")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isBadRequest());
    }

    /** 애플리케이션이 같은 파일에 계속 기록하므로 줄 수를 고정하지 않고 조회 가능 여부만 확인한다. */
    @Test
    void returnsRecentLinesForAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/logs")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.lines").isArray())
                .andExpect(jsonPath("$.lines").isNotEmpty())
                .andExpect(jsonPath("$.entries").isArray())
                .andExpect(jsonPath("$.entries").isNotEmpty());
    }

    @Test
    void limitsReturnedLines() throws Exception {
        mockMvc.perform(get("/api/v1/admin/logs")
                        .param("limit", "2")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines.length()").value(2));
    }

    @Test
    void filtersByKeywordIgnoringCase() throws Exception {
        mockMvc.perform(get("/api/v1/admin/logs")
                        .param("keyword", "DISK")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines.length()").value(1))
                .andExpect(jsonPath("$.lines[0]").value("WARN Disk Full"))
                .andExpect(jsonPath("$.entries[0].format").value("LEGACY"))
                .andExpect(jsonPath("$.entries[0].level").value("WARN"))
                .andExpect(jsonPath("$.entries[0].message").value("WARN Disk Full"));
    }

    @Test
    void rejectsProducerSession() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/admin/logs")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsApplicantSession() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(8L, MemberType.APPLICANT, MemberStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/admin/logs")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsAnonymousRequest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/logs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }
}
