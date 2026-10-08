package art.yesulin.operation.presentation.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-otr-redirect-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminOtrRedirectControllerTest {

    private static final String ENDPOINT = "/api/v1/admin/otr-redirects";
    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Seoul"));
    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);

    @TempDir
    private static Path logDirectory;

    @DynamicPropertySource
    static void logProperties(DynamicPropertyRegistry registry) {
        registry.add("logging.file.name", () -> logPath().toString());
    }

    private static Path logPath() {
        return logDirectory.resolve("admin-otr-redirect-api-test.log");
    }

    @Autowired
    private MockMvc mockMvc;

    @BeforeAll
    static void writeLogs() throws IOException {
        String clicks = IntStream.range(0, 600)
                .mapToObj(index -> event(TODAY, "22310", "GET", 302))
                .collect(Collectors.joining());
        Files.writeString(logPath(), clicks + "broken JSON\n" + event(TODAY, "22310", "HEAD", 302)
                + event(TODAY, "22310", "GET", 400) + event(TODAY, "abc", "GET", 302)
                + event(TODAY.minusDays(20), "22310", "GET", 302), StandardCharsets.UTF_8);
        writeArchive(TODAY, event(TODAY, "22310", "GET", 302));
        writeArchive(TODAY.minusDays(1), event(TODAY.minusDays(1), "22311", "GET", 302));
    }

    private static String event(LocalDate date, String otrId, String method, int status) {
        return """
                {"@timestamp":"%sT12:00:00+09:00","event":"HTTP_REQUEST","method":"%s",\
                "endpoint":"/api/v1/otr","status":%d,"otrId":"%s"}
                """.formatted(date, method, status, otrId);
    }

    private static void writeArchive(LocalDate date, String content) throws IOException {
        Path archive = Path.of(logPath() + "." + date + ".0.gz");
        try (OutputStream output = new GZIPOutputStream(Files.newOutputStream(archive))) {
            output.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    @Test
    void countsBeyondRecentLineLimitIncludingTodayAndOlderArchives() throws Exception {
        mockMvc.perform(get(ENDPOINT).param("days", "7").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.environment").value("LOCAL"))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.truncated").value(false))
                .andExpect(jsonPath("$.totalClicks").value(602))
                .andExpect(jsonPath("$.links.length()").value(2))
                .andExpect(jsonPath("$.links[0].otrId").value("22310"))
                .andExpect(jsonPath("$.links[0].clicks").value(601));
    }

    @Test
    void excludesYesterdayWhenTodayIsSelected() throws Exception {
        mockMvc.perform(get(ENDPOINT).param("days", "1").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalClicks").value(601))
                .andExpect(jsonPath("$.links.length()").value(1));
    }

    @Test
    void rejectsInvalidPeriod() throws Exception {
        mockMvc.perform(get(ENDPOINT).param("days", "15").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAnonymousRequest() throws Exception {
        mockMvc.perform(get(ENDPOINT)).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsNonAdminSession() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);
        mockMvc.perform(get(ENDPOINT).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer))
                .andExpect(status().isForbidden());
    }
}
