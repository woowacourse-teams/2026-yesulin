package art.yesulin.presentation.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ShowTestFixture;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-show-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminShowControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);
    private static final long OWNER_ID = 7L;
    private static final String PATH = "/api/v1/admin/shows/{showId}/host-name";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private ShowSessionRepository sessionRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    private Show show;

    @BeforeEach
    void setUp() {
        ShowTestFixture fixture = new ShowTestFixture(
                showRepository, sessionRepository, reservationRepository, fileAssetRepository, fileReferenceRepository
        );
        fixture.cleanUp();
        adminAuditLogRepository.deleteAll();
        producerRepository.deleteAll();
        producerRepository.save(new Producer(OWNER_ID, "홍길동", "01012345678"));
        show = fixture.openShow(OWNER_ID, 10);
    }

    @Test
    void adminReplacesHostNameWithoutRecordingTheName() throws Exception {
        mockMvc.perform(put(PATH, show.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\": \"  극단 달빛  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.showId").value(show.getPublicId().toString()))
                .andExpect(jsonPath("$.hostName").value("극단 달빛"))
                .andExpect(jsonPath("$.companyName").value("홍길동"));

        assertEquals("극단 달빛", showRepository.findByPublicId(show.getPublicId()).orElseThrow().getHostName());
        mockMvc.perform(get("/api/v1/public/shows/{showId}", show.getPublicId()))
                .andExpect(jsonPath("$.hostName").value("극단 달빛"));
        mockMvc.perform(get("/api/v1/admin/shows").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shows[0].hostName").value("극단 달빛"))
                .andExpect(jsonPath("$.shows[0].companyName").value("홍길동"));

        List<AdminAuditLog> logs = adminAuditLogRepository.findAll();
        assertEquals(1, logs.size());
        assertEquals(AdminAction.SHOW_HOST_NAME_CHANGED, logs.getFirst().getAction());
        assertEquals(ADMIN.memberId(), logs.getFirst().getActorMemberId());
        assertEquals(show.getId(), logs.getFirst().getTargetId());
        assertFalse(logs.getFirst().getDetail().contains("극단 달빛"));
        assertFalse(logs.getFirst().getDetail().contains("홍길동"));
    }

    @Test
    void blankHostNameFallsBackToCompanyName() throws Exception {
        show.updateHostName("극단 달빛");
        showRepository.save(show);

        mockMvc.perform(put(PATH, show.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\": \"  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hostName").value(""));

        mockMvc.perform(get("/api/v1/public/shows/{showId}", show.getPublicId()))
                .andExpect(jsonPath("$.hostName").value("홍길동"));
        assertEquals("주최 이름을 계정 기획사명으로 되돌림", adminAuditLogRepository.findAll().getFirst().getDetail());
    }

    @Test
    void validatesBodyAndShow() throws Exception {
        String tooLong = "{\"hostName\": \"%s\"}".formatted("가".repeat(51));
        for (String body : new String[] {"{}", "{\"hostName\": null}", tooLong}) {
            mockMvc.perform(put(PATH, show.getPublicId())
                            .with(csrf())
                            .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(put(PATH, UUID.randomUUID())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\": \"극단 달빛\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SHOW_NOT_FOUND"));
        assertEquals(0, adminAuditLogRepository.count());
    }

    @Test
    void allowsOnlyAdminWithCsrf() throws Exception {
        MemberPrincipal owner = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(put(PATH, show.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\": \"극단 달빛\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
        mockMvc.perform(put(PATH, show.getPublicId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\": \"극단 달빛\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put(PATH, show.getPublicId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\": \"극단 달빛\"}"))
                .andExpect(status().isForbidden());

        assertEquals("", showRepository.findByPublicId(show.getPublicId()).orElseThrow().getHostName());
    }
}
