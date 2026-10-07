package art.yesulin.presentation.api.show;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ShowTestFixture;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
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
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-show-management-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, AdminShowManagementControllerTest.FixedClockConfiguration.class})
@AutoConfigureMockMvc
class AdminShowManagementControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);
    private static final MemberPrincipal PRODUCER = new MemberPrincipal(7L, MemberType.PRODUCER, MemberStatus.ACTIVE);
    private static final String NAVER_FORM_URL = "https://form.naver.com/response/abc123";

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
    private AdminAuditLogRepository adminAuditLogRepository;

    private ShowTestFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = new ShowTestFixture(
                showRepository, sessionRepository, reservationRepository, fileAssetRepository, fileReferenceRepository
        );
        fixture.cleanUp();
        adminAuditLogRepository.deleteAll();
    }

    @Test
    void adminRegistersExternalReservationShowAndAudienceIsSentAway() throws Exception {
        String created = mockMvc.perform(post("/api/v1/admin/shows")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(showRequest(fixture.readyImage(ADMIN.memberId()), " " + NAVER_FORM_URL + " ")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.hostName").value("서울숲 거리극 모임"))
                .andExpect(jsonPath("$.externalReservationUrl").value(NAVER_FORM_URL))
                .andReturn().getResponse().getContentAsString();
        String showId = JsonPath.read(created, "$.id");
        String withSession = mockMvc.perform(post("/api/v1/admin/shows/{showId}/sessions", showId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startsAt": "2026-10-01T10:00:00Z"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].capacity").value(0))
                .andReturn().getResponse().getContentAsString();
        int sessionId = JsonPath.read(withSession, "$.sessions[0].id");
        mockMvc.perform(post("/api/v1/admin/shows/{showId}/opening", showId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        mockMvc.perform(get("/api/v1/public/shows"))
                .andExpect(jsonPath("$.shows[0].id").value(showId))
                .andExpect(jsonPath("$.shows[0].hostName").value("서울숲 거리극 모임"));
        mockMvc.perform(get("/api/v1/public/shows/{showId}", showId))
                .andExpect(jsonPath("$.externalReservationUrl").value(NAVER_FORM_URL))
                .andExpect(jsonPath("$.sessions[0].remainingSeats").value(nullValue()))
                .andExpect(jsonPath("$.sessions[0].maxTicketCount").value(0))
                .andExpect(jsonPath("$.sessions[0].bookable").value(true));
        mockMvc.perform(post("/api/v1/public/shows/{showId}/sessions/{sessionId}/reservations", showId, sessionId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"bookerName": "홍길동", "bookerPhone": "010-1234-5678", "ticketCount": 2, "privacyAgreed": true}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SHOW_EXTERNAL_RESERVATION"));
        mockMvc.perform(post("/api/v1/public/shows/{showId}/external-reservation-visits", showId).with(csrf()))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/v1/public/shows/{showId}/external-reservation-visits", showId))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/shows").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(jsonPath("$.shows[0].externalReservationUrl").value(NAVER_FORM_URL))
                .andExpect(jsonPath("$.shows[0].externalReservationVisits").value(1));
        mockMvc.perform(get("/api/v1/admin/shows/{showId}", showId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(jsonPath("$.externalReservationVisits").value(1));
        mockMvc.perform(put("/api/v1/admin/shows/{showId}/sessions/{sessionId}", showId, sessionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startsAt": "2026-10-02T10:00:00Z"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].startsAt").value("2026-10-02T10:00:00Z"))
                .andExpect(jsonPath("$.sessions[0].capacity").value(0));

        // 기획사는 운영자 공연을 찾을 수 없다.
        mockMvc.perform(get("/api/v1/shows/{showId}", showId).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/admin/shows/{showId}", showId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isNoContent());
        List<AdminAction> actions = adminAuditLogRepository.findAll().stream()
                .sorted(Comparator.comparing(AdminAuditLog::getId))
                .map(AdminAuditLog::getAction)
                .toList();
        assertEquals(
                List.of(AdminAction.SHOW_CREATED, AdminAction.SHOW_STATUS_CHANGED, AdminAction.SHOW_DELETED), actions
        );
    }

    @Test
    void adminCannotManageProducerShowsOrSkipRequiredFields() throws Exception {
        Show producerShow = fixture.openShow(PRODUCER.memberId(), 10);
        long posterFileId = fixture.readyImage(ADMIN.memberId());

        mockMvc.perform(get("/api/v1/admin/shows/{showId}", producerShow.getPublicId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SHOW_NOT_FOUND"));
        String valid = showRequest(posterFileId, NAVER_FORM_URL);
        for (String body : List.of(
                valid.replace("\"externalReservationUrl\": \"" + NAVER_FORM_URL + "\",", ""),
                valid.replace("\"서울숲 거리극 모임\"", "\" \""))) {
            mockMvc.perform(post("/api/v1/admin/shows")
                            .with(csrf())
                            .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(post("/api/v1/admin/shows")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid.replace(NAVER_FORM_URL, "form.naver.com/response/abc123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SHOW_INVALID_INPUT"));
        mockMvc.perform(post("/api/v1/admin/shows")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(valid))
                .andExpect(status().isForbidden());
        assertEquals(1, showRepository.count());
    }

    private static String showRequest(long posterFileId, String externalReservationUrl) {
        return """
                {
                  "title": "숲속 버스킹 연극",
                  "genre": "PLAY",
                  "description": "네이버 폼으로 예매받는 야외 공연",
                  "venue": {
                    "name": "서울숲 야외무대",
                    "roadAddress": "서울특별시 성동구 뚝섬로 273",
                    "detailAddress": "",
                    "zonecode": "",
                    "latitude": null,
                    "longitude": null
                  },
                  "hostName": "서울숲 거리극 모임",
                  "runningMinutes": 50,
                  "ageRating": "전체관람가",
                  "inquiryPhone": "010-3456-7890",
                  "links": [],
                  "guides": [],
                  "externalReservationUrl": "%s",
                  "posterFileId": %d,
                  "imageFileIds": []
                }
                """.formatted(externalReservationUrl, posterFileId);
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedAdminShowClock() {
            return Clock.fixed(ShowTestFixture.NOW, ZoneOffset.UTC);
        }
    }
}
