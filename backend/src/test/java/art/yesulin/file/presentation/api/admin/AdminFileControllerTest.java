package art.yesulin.file.presentation.api.admin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.FileService;
import art.yesulin.file.application.FileUploadCommand;
import art.yesulin.file.application.FileUploadResult;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import at.favre.lib.crypto.bcrypt.BCrypt;
import jakarta.servlet.ServletException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-files;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AdminFileControllerTest.FixedClockConfiguration.class})
@AutoConfigureMockMvc
class AdminFileControllerTest {

    private static final String PATH = "/api/v1/admin/files/unreferenced";
    private static final Instant NOW = Instant.parse("2026-09-28T05:00:00Z");
    private static final MemberPrincipal ADMIN = new MemberPrincipal(99L, MemberType.ADMIN, MemberStatus.ACTIVE);
    private static final String PASSWORD_BODY = "{\"confirmationPassword\":\"password\"}";

    @DynamicPropertySource
    static void registerDeletionPassword(DynamicPropertyRegistry registry) {
        registry.add("yesulin.admin.deletion-password-hash", () -> BCrypt.withDefaults()
                .hashToString(10, "password".toCharArray()));
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private FileService fileService;

    @BeforeEach
    void cleanUp() {
        jdbcTemplate.update("delete from file_references");
        jdbcTemplate.update("delete from admin_audit_logs");
        jdbcTemplate.update("delete from file_assets");
    }

    @Test
    void listsRecentAndOldUnusedFilesWithDifferentClocks() throws Exception {
        Instant now = NOW;
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

    @Test
    void deletesOnlyOldUnusedFileAndRecordsAudit() throws Exception {
        insertFile(903L, "PENDING", NOW.minus(8, ChronoUnit.DAYS), null);

        // when
        mockMvc.perform(delete("/api/v1/admin/files/903").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                // then
                .andExpect(status().isNoContent());

        String status = jdbcTemplate.queryForObject("select status from file_assets where id = 903", String.class);
        String action = jdbcTemplate.queryForObject(
                "select action from admin_audit_logs where target_type = 'FILE' and target_id = 903", String.class);
        org.junit.jupiter.api.Assertions.assertEquals("DELETED", status);
        org.junit.jupiter.api.Assertions.assertEquals("FILE_DELETED", action);
    }

    @Test
    void rejectsDeletionBeforeSevenDays() throws Exception {
        insertFile(904L, "READY", NOW.minus(30, ChronoUnit.DAYS),
                NOW.minus(1, ChronoUnit.DAYS));

        mockMvc.perform(delete("/api/v1/admin/files/904").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_TOO_RECENT"));
    }

    @Test
    void rejectsDeletionWhenFileGainsReference() throws Exception {
        insertFile(905L, "READY", NOW.minus(30, ChronoUnit.DAYS),
                NOW.minus(8, ChronoUnit.DAYS));
        jdbcTemplate.update("""
                insert into file_references (file_id, reference_type, reference_id, created_at)
                values (905, 'SUBMISSION_PHOTO', 20, current_timestamp)
                """);

        mockMvc.perform(delete("/api/v1/admin/files/905").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_STILL_IN_USE"));
    }

    @Test
    void retriesStorageFailureWithoutLosingTheFileRecord() throws Exception {
        insertFile(906L, "PENDING", NOW.minus(8, ChronoUnit.DAYS), null);
        objectStorage.failNextDelete();

        assertThrows(ServletException.class, () -> mockMvc.perform(delete("/api/v1/admin/files/906")
                .with(csrf())
                .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY)));

        org.junit.jupiter.api.Assertions.assertEquals("DELETING", jdbcTemplate.queryForObject(
                "select status from file_assets where id = 906", String.class));
        mockMvc.perform(get(PATH).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files[0].status").value("DELETING"))
                .andExpect(jsonPath("$.files[0].deletable").value(true));

        mockMvc.perform(delete("/api/v1/admin/files/906").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/v1/admin/files/906").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isNoContent());

        org.junit.jupiter.api.Assertions.assertEquals("DELETED", jdbcTemplate.queryForObject(
                "select status from file_assets where id = 906", String.class));
        org.junit.jupiter.api.Assertions.assertEquals(1L, jdbcTemplate.queryForObject(
                "select count(*) from admin_audit_logs where target_type = 'FILE' and target_id = 906",
                Long.class));
    }

    @Test
    void deleteRequiresAdminAndCsrf() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(1L, MemberType.APPLICANT, MemberStatus.ACTIVE);

        mockMvc.perform(delete("/api/v1/admin/files/907").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/v1/admin/files/907")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void allowsDeletionAtExactlySevenDays() throws Exception {
        insertFile(908L, "PENDING", NOW.minus(7, ChronoUnit.DAYS), null);

        mockMvc.perform(delete("/api/v1/admin/files/908").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isNoContent());
    }

    @Test
    void deletesUploadedObjectAsWellAsMarkingFileDeleted() throws Exception {
        FileUploadResult upload = fileService.requestPrivateActorPhotoUpload(
                1L, new FileUploadCommand("photo.png", "image/png", 10L));
        objectStorage.upload(upload.uploadUrl(), "image/png", 10L);
        fileService.completeUpload(1L, upload.fileId());
        String objectKey = jdbcTemplate.queryForObject(
                "select object_key from file_assets where id = ?", String.class, upload.fileId());
        jdbcTemplate.update("update file_assets set unreferenced_at = ? where id = ?",
                Timestamp.from(NOW.minus(7, ChronoUnit.DAYS)), upload.fileId());

        mockMvc.perform(delete("/api/v1/admin/files/{fileId}", upload.fileId()).with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(PASSWORD_BODY))
                .andExpect(status().isNoContent());

        assertFalse(objectStorage.inspect(objectKey).isPresent());
    }

    @Test
    void deletesSelectedFilesWithOneConfirmationAndReportsEachResult() throws Exception {
        // given
        insertFile(920L, "PENDING", NOW.minus(8, ChronoUnit.DAYS), null);
        insertFile(921L, "READY", NOW.minus(30, ChronoUnit.DAYS), NOW.minus(1, ChronoUnit.DAYS));
        insertFile(922L, "READY", NOW.minus(30, ChronoUnit.DAYS), NOW.minus(8, ChronoUnit.DAYS));
        jdbcTemplate.update("""
                insert into file_references (file_id, reference_type, reference_id, created_at)
                values (922, 'SUBMISSION_PHOTO', 20, current_timestamp)
                """);

        // when
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fileIds":[920,921,922,923],"confirmationPassword":"password"}
                                """))
                // then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].fileId").value(920))
                .andExpect(jsonPath("$.results[0].status").value("DELETED"))
                .andExpect(jsonPath("$.results[1].code").value("FILE_TOO_RECENT"))
                .andExpect(jsonPath("$.results[2].code").value("FILE_STILL_IN_USE"))
                .andExpect(jsonPath("$.results[3].code").value("FILE_NOT_FOUND"));

        org.junit.jupiter.api.Assertions.assertEquals("DELETED", jdbcTemplate.queryForObject(
                "select status from file_assets where id = 920", String.class));
        org.junit.jupiter.api.Assertions.assertEquals("READY", jdbcTemplate.queryForObject(
                "select status from file_assets where id = 921", String.class));
    }

    @Test
    void rejectsWholeBatchWhenConfirmationFailsOrSelectionIsInvalid() throws Exception {
        // given
        insertFile(924L, "PENDING", NOW.minus(8, ChronoUnit.DAYS), null);

        // when, then
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fileIds":[924],"confirmationPassword":"wrong"}
                                """))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fileIds":[924,924],"confirmationPassword":"password"}
                                """))
                .andExpect(status().isBadRequest());
        org.junit.jupiter.api.Assertions.assertEquals("PENDING", jdbcTemplate.queryForObject(
                "select status from file_assets where id = 924", String.class));
    }

    @Test
    void continuesBatchAfterStorageFailureAndAllowsRetry() throws Exception {
        // given
        insertFile(925L, "PENDING", NOW.minus(8, ChronoUnit.DAYS), null);
        insertFile(926L, "PENDING", NOW.minus(8, ChronoUnit.DAYS), null);
        objectStorage.failNextDelete();

        // when
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fileIds":[925,926],"confirmationPassword":"password"}
                                """))
                // then
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].status").value("FAILED"))
                .andExpect(jsonPath("$.results[0].code").value("FILE_DELETION_FAILED"))
                .andExpect(jsonPath("$.results[1].status").value("DELETED"));

        org.junit.jupiter.api.Assertions.assertEquals("DELETING", jdbcTemplate.queryForObject(
                "select status from file_assets where id = 925", String.class));
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fileIds":[925,926],"confirmationPassword":"password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].status").value("DELETED"))
                .andExpect(jsonPath("$.results[1].status").value("ALREADY_DELETED"));
    }

    @Test
    void batchRequiresAdminAndCsrfAndLimitsSelectionToOneHundred() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(1L, MemberType.APPLICANT, MemberStatus.ACTIVE);
        String request = "{\"fileIds\":[1],\"confirmationPassword\":\"password\"}";

        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/files/deletions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileIds\":[],\"confirmationPassword\":\"password\"}"))
                .andExpect(status().isBadRequest());
        String tooManyIds = java.util.stream.LongStream.rangeClosed(1, 101)
                .mapToObj(String::valueOf).collect(java.util.stream.Collectors.joining(","));
        mockMvc.perform(post("/api/v1/admin/files/deletions").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileIds\":[" + tooManyIds + "],\"confirmationPassword\":\"password\"}"))
                .andExpect(status().isBadRequest());
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

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, java.time.ZoneOffset.UTC);
        }
    }
}
