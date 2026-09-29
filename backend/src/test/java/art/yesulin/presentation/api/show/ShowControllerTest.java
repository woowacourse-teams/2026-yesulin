package art.yesulin.presentation.api.show;

import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
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
        "spring.datasource.url=jdbc:h2:mem:show-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, ShowControllerTest.FixedClockConfiguration.class})
@AutoConfigureMockMvc
class ShowControllerTest {

    private static final MemberPrincipal OWNER = new MemberPrincipal(1L, MemberType.PRODUCER, MemberStatus.ACTIVE);
    private static final MemberPrincipal OTHER = new MemberPrincipal(2L, MemberType.PRODUCER, MemberStatus.ACTIVE);
    private static final MemberPrincipal APPLICANT = new MemberPrincipal(3L, MemberType.APPLICANT, MemberStatus.ACTIVE);

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

    private ShowTestFixture fixture;

    @BeforeEach
    void setUp() {
        fixture = new ShowTestFixture(
                showRepository, sessionRepository, reservationRepository, fileAssetRepository, fileReferenceRepository
        );
        fixture.cleanUp();
    }

    @Test
    void producerCreatesOpensAndAudienceReserves() throws Exception {
        long posterFileId = fixture.readyImage(OWNER.memberId());
        long imageFileId = fixture.readyImage(OWNER.memberId());
        String created = mockMvc.perform(post("/api/v1/shows")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(showRequest(posterFileId, imageFileId)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.genre").value("MUSICAL"))
                .andExpect(jsonPath("$.venue.name").value("예술인 소극장"))
                .andExpect(jsonPath("$.poster.fileId").value(posterFileId))
                .andExpect(jsonPath("$.poster.url").value(startsWith("https://cdn.test/")))
                .andExpect(jsonPath("$.images[0].fileId").value(imageFileId))
                .andExpect(jsonPath("$.links[0].label").value("공연사 인스타그램 보기"))
                .andExpect(jsonPath("$.links[0].url").value("https://instagram.com/yesulin"))
                .andExpect(jsonPath("$.directionsNote").value("혜화역 2번 출구에서 도보 5분"))
                .andExpect(jsonPath("$.remainingSeatsVisible").value(true))
                .andReturn().getResponse().getContentAsString();
        String showId = JsonPath.read(created, "$.id");

        String withSession = mockMvc.perform(post("/api/v1/shows/{showId}/sessions", showId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startsAt": "2026-10-01T10:00:00Z", "capacity": 20}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessions[0].capacity").value(20))
                .andExpect(jsonPath("$.sessions[0].reservedTickets").value(0))
                .andExpect(jsonPath("$.sessions[0].hasReservations").value(false))
                .andReturn().getResponse().getContentAsString();
        int sessionId = JsonPath.read(withSession, "$.sessions[0].id");

        mockMvc.perform(post("/api/v1/shows/{showId}/opening", showId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"));

        mockMvc.perform(get("/api/v1/public/shows"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shows[0].id").value(showId))
                .andExpect(jsonPath("$.shows[0].genre").value("MUSICAL"))
                .andExpect(jsonPath("$.shows[0].venueName").value("예술인 소극장"))
                .andExpect(jsonPath("$.shows[0].nextSessionStartsAt").value("2026-10-01T10:00:00Z"));

        mockMvc.perform(get("/api/v1/public/shows/{showId}", showId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posterUrl").isNotEmpty())
                .andExpect(jsonPath("$.imageUrls.length()").value(1))
                .andExpect(jsonPath("$.maxTicketsPerReservation").value(10))
                .andExpect(jsonPath("$.links[0].label").value("공연사 인스타그램 보기"))
                .andExpect(jsonPath("$.directionsNote").value("혜화역 2번 출구에서 도보 5분"))
                .andExpect(jsonPath("$.remainingSeatsVisible").doesNotExist())
                .andExpect(jsonPath("$.sessions[0].remainingSeats").value(20))
                .andExpect(jsonPath("$.sessions[0].maxTicketCount").value(10))
                .andExpect(jsonPath("$.sessions[0].bookable").value(true))
                .andExpect(jsonPath("$.sessions[0].capacity").doesNotExist());

        mockMvc.perform(put("/api/v1/shows/{showId}", showId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(showRequest(posterFileId, imageFileId)
                                .replace("\"remainingSeatsVisible\": true", "\"remainingSeatsVisible\": false")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remainingSeatsVisible").value(false))
                .andExpect(jsonPath("$.sessions[0].capacity").value(20));

        mockMvc.perform(get("/api/v1/public/shows/{showId}", showId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions[0].remainingSeats").value(nullValue()))
                .andExpect(jsonPath("$.sessions[0].maxTicketCount").value(10))
                .andExpect(jsonPath("$.sessions[0].bookable").value(true));

        mockMvc.perform(post("/api/v1/public/shows/{showId}/sessions/{sessionId}/reservations", showId, sessionId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest("010-1234-5678", 3)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(matchesPattern("[2-9A-HJ-NP-Z]{8}")))
                .andExpect(jsonPath("$.showTitle").value("달빛 아래 소극장"))
                .andExpect(jsonPath("$.startsAt").value("2026-10-01T10:00:00Z"))
                .andExpect(jsonPath("$.ticketCount").value(3));

        String reservations = mockMvc.perform(get(
                        "/api/v1/shows/{showId}/sessions/{sessionId}/reservations", showId, sessionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reservations[0].bookerName").value("홍길동"))
                .andExpect(jsonPath("$.reservations[0].bookerPhone").value("010-1234-5678"))
                .andExpect(jsonPath("$.reservations[0].status").value("CONFIRMED"))
                .andReturn().getResponse().getContentAsString();
        int reservationId = JsonPath.read(reservations, "$.reservations[0].id");

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/cancellation", reservationId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OTHER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESERVATION_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/reservations/{reservationId}/cancellation", reservationId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"))
                .andExpect(jsonPath("$.canceledAt").value("2026-09-27T00:00:00Z"));
    }

    @Test
    void publicReservationValidatesInputAndRequiresCsrf() throws Exception {
        Show show = fixture.openShow(OWNER.memberId(), 5);
        long sessionId = fixture.firstSession(show).getId();
        String path = "/api/v1/public/shows/{showId}/sessions/{sessionId}/reservations";

        mockMvc.perform(post(path, show.getPublicId(), sessionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest("010-1234-5678", 1)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post(path, show.getPublicId(), sessionId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest("01012345678", 11)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.detail.bookerPhone").exists())
                .andExpect(jsonPath("$.detail.ticketCount").exists());

        mockMvc.perform(post(path, show.getPublicId(), sessionId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest("010-1234-5678", 6)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SHOW_SESSION_NOT_ENOUGH_SEATS"));
    }

    @Test
    void managementRequiresActiveProducerAndHidesOtherProducersShows() throws Exception {
        Show show = fixture.show(OWNER.memberId());

        mockMvc.perform(get("/api/v1/shows"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/shows")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/shows/{showId}", show.getPublicId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OTHER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SHOW_NOT_FOUND"));
        mockMvc.perform(put("/api/v1/shows/{showId}", show.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(showRequest(fixture.readyImage(OWNER.memberId()), null)
                                .replace("\"MUSICAL\"", "null")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/v1/shows/{showId}", show.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(showRequest(fixture.readyImage(OWNER.memberId()), null)
                                .replace("https://instagram.com/yesulin", "instagram.com/yesulin")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SHOW_INVALID_INPUT"));
        mockMvc.perform(put("/api/v1/shows/{showId}", show.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OWNER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(showRequest(fixture.readyImage(OWNER.memberId()), null)
                                .replace("\"공연사 인스타그램 보기\"", "\"\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mockMvc.perform(get("/api/v1/public/shows/{showId}", show.getPublicId()))
                .andExpect(status().isNotFound());
    }

    private static String showRequest(long posterFileId, Long imageFileId) {
        return """
                {
                  "title": "달빛 아래 소극장",
                  "genre": "MUSICAL",
                  "description": "무료 창작 뮤지컬",
                  "venue": {
                    "name": "예술인 소극장",
                    "roadAddress": "서울특별시 종로구 대학로 12",
                    "detailAddress": "",
                    "zonecode": "",
                    "latitude": null,
                    "longitude": null
                  },
                  "directionsNote": "혜화역 2번 출구에서 도보 5분",
                  "runningMinutes": 100,
                  "ageRating": "8세 이상",
                  "inquiryPhone": "02-123-4567",
                  "links": [{"label": "공연사 인스타그램 보기", "url": "https://instagram.com/yesulin"}],
                  "remainingSeatsVisible": true,
                  "posterFileId": %d,
                  "imageFileIds": [%s]
                }
                """.formatted(posterFileId, imageFileId == null ? "" : imageFileId);
    }

    private static String reservationRequest(String phone, int ticketCount) {
        return """
                {"bookerName": "홍길동", "bookerPhone": "%s", "ticketCount": %d, "privacyAgreed": true}
                """.formatted(phone, ticketCount);
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedShowApiClock() {
            return Clock.fixed(ShowTestFixture.NOW, ZoneOffset.UTC);
        }
    }
}
