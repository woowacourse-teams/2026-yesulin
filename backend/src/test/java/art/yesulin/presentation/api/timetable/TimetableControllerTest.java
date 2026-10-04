package art.yesulin.presentation.api.timetable;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.timetable.TimetableActorRepository;
import art.yesulin.domain.timetable.TimetableMessageRepository;
import art.yesulin.domain.timetable.TimetableRepository;
import art.yesulin.domain.timetable.TimetableRequestRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.Instant;
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

/** 일정표 HTTP 계약. Flyway로 만든 스키마를 엔티티와 대조하도록 마이그레이션을 실행한다. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:timetable-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import({ObjectStorageTestConfiguration.class, TimetableControllerTest.FixedClockConfiguration.class})
@AutoConfigureMockMvc
class TimetableControllerTest {

    private static final String KEY = "X-Timetable-Key";
    private static final MemberPrincipal ADMIN = new MemberPrincipal(99L, MemberType.ADMIN, MemberStatus.ACTIVE);
    private static final MemberPrincipal PRODUCER = new MemberPrincipal(1L, MemberType.PRODUCER, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TimetableRepository timetableRepository;

    @Autowired
    private TimetableActorRepository actorRepository;

    @Autowired
    private TimetableRequestRepository requestRepository;

    @Autowired
    private TimetableMessageRepository messageRepository;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAllInBatch();
        requestRepository.deleteAllInBatch();
        actorRepository.deleteAllInBatch();
        timetableRepository.deleteAll();
    }

    @Test
    void organizerBuildsAndPublishesTimetableThenActorMovesWithLink() throws Exception {
        String manageKey = create();

        String registered = mockMvc.perform(post("/api/v1/timetables/manage/actors")
                        .with(csrf())
                        .header(KEY, manageKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"actors": [
                                  {"name": "김배우", "phone": "010-1111-1111"},
                                  {"name": "이배우", "phone": "010-2222-2222"}
                                ]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.actors", hasSize(2)))
                .andExpect(jsonPath("$.actors[0].slot").value(nullValue()))
                .andExpect(jsonPath("$.actors[0].invited").value(false))
                .andExpect(jsonPath("$.actors[0].registeredAt").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        int first = JsonPath.read(registered, "$.actors[0].id");
        int second = JsonPath.read(registered, "$.actors[1].id");

        mockMvc.perform(put("/api/v1/timetables/manage/board")
                        .with(csrf())
                        .header(KEY, manageKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "setting": %s,
                                  "assignments": [
                                    {"actorId": %d, "previous": null, "next": {"date": "2026-10-10", "startTime": "10:00"}},
                                    {"actorId": %d, "next": {"date": "2026-10-10", "startTime": "10:30"}}
                                  ]
                                }
                                """.formatted(setting(), first, second)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actors[0].slot.date").value("2026-10-10"))
                .andExpect(jsonPath("$.actors[0].slot.startTime").value("10:00:00"))
                .andExpect(jsonPath("$.actors[0].slot.endTime").value("10:30:00"));

        mockMvc.perform(post("/api/v1/timetables/manage/publication")
                        .with(csrf())
                        .header(KEY, manageKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.actors[0].invited").value(true));

        String accessKey = actorRepository.findById((long) first).orElseThrow().getAccessKey();
        mockMvc.perform(get("/api/v1/timetables/actor").header(KEY, accessKey))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.actorName").value("김배우"))
                .andExpect(jsonPath("$.organizerName").value("남극장"))
                .andExpect(jsonPath("$.selfChange").value("OPEN"))
                .andExpect(jsonPath("$.changeDeadline").value("2026-10-09T01:00:00Z"))
                .andExpect(jsonPath("$.openSlots[0].startTime").value("11:00:00"))
                .andExpect(jsonPath("$.phone").doesNotExist());

        mockMvc.perform(put("/api/v1/timetables/actor/slot")
                        .with(csrf())
                        .header(KEY, accessKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"current": {"date": "2026-10-10", "startTime": "10:00"},
                                 "next": {"date": "2026-10-10", "startTime": "11:00"}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slot.startTime").value("11:00:00"));

        mockMvc.perform(post("/api/v1/timetables/actor/requests")
                        .with(csrf())
                        .header(KEY, accessKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"message": "토요일 오후가 좋아요."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.request.message").value("토요일 오후가 좋아요."));

        String board = mockMvc.perform(get("/api/v1/timetables/manage").header(KEY, manageKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actors[0].slot.startTime").value("11:00:00"))
                .andExpect(jsonPath("$.actors[0].previousSlot.startTime").value("10:00:00"))
                .andExpect(jsonPath("$.actors[0].actorChangedAt").value("2026-10-03T01:00:00Z"))
                .andExpect(jsonPath("$.requests[0].actorName").value("김배우"))
                .andReturn().getResponse().getContentAsString();
        int requestId = JsonPath.read(board, "$.requests[0].id");

        mockMvc.perform(post("/api/v1/timetables/manage/requests/{requestId}/resolution", requestId)
                        .with(csrf())
                        .header(KEY, manageKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requests", hasSize(0)));

        mockMvc.perform(put("/api/v1/timetables/manage/self-change-lock")
                        .with(csrf())
                        .header(KEY, manageKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"locked": true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selfChangeLocked").value(true));

        mockMvc.perform(delete("/api/v1/timetables/manage/actors/{actorId}", second)
                        .with(csrf())
                        .header(KEY, manageKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actors", hasSize(1)));
    }

    @Test
    void hidesTimetableWithoutValidKeyAndRequiresCsrfForWrites() throws Exception {
        String manageKey = create();

        mockMvc.perform(get("/api/v1/timetables/manage"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mockMvc.perform(get("/api/v1/timetables/manage").header(KEY, "A".repeat(22)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TIMETABLE_NOT_FOUND"));
        mockMvc.perform(get("/api/v1/timetables/actor").header(KEY, manageKey))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/timetables/manage/publication").header(KEY, manageKey))
                .andExpect(status().isForbidden());
    }

    @Test
    void reportsInvalidFieldsWithPaths() throws Exception {
        String manageKey = create();

        mockMvc.perform(post("/api/v1/timetables/manage/actors")
                        .with(csrf())
                        .header(KEY, manageKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"actors": [{"name": "김배우", "phone": "01011111111"}]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail['actors[0].phone']")
                        .value("휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요."));

        mockMvc.perform(post("/api/v1/timetables/manage/publication")
                        .with(csrf())
                        .header(KEY, manageKey))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TIMETABLE_NOT_PUBLISHABLE"));

        mockMvc.perform(post("/api/v1/timetables")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"profile": %s, "setting": {"slotMinutes": 30, "slotCapacity": 1, "windows": [
                                  {"date": "2026-10-10", "startTime": "10:00", "endTime": "12:00"},
                                  {"date": "2026-10-10", "startTime": "11:00", "endTime": "13:00"}
                                ]}}
                                """.formatted(profile())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TIMETABLE_INVALID_INPUT"));
    }

    @Test
    void operatorReadsQueueAndMarksMessagesSent() throws Exception {
        create();
        Long messageId = messageRepository.findAll().getFirst().getId();

        mockMvc.perform(get("/api/v1/admin/timetable-messages")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/timetable-messages")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.pendingCount").value(1))
                .andExpect(jsonPath("$.messages[0].type").value("ORGANIZER_LINK"))
                .andExpect(jsonPath("$.messages[0].recipientPhone").value("010-9999-0000"))
                .andExpect(jsonPath("$.messages[0].timetableTitle").value("남극장 2차 오디션"))
                .andExpect(jsonPath("$.messages[0].body").value(matchesPattern(
                        "(?s).*http://localhost:3000/timetable/manage/[A-Za-z0-9_-]{22}\n.*")));

        mockMvc.perform(post("/api/v1/admin/timetable-messages/completion")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"messageIds": [%d]}
                                """.formatted(messageId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[0].status").value("SENT"))
                .andExpect(jsonPath("$.messages[0].sentAt").value("2026-10-03T01:00:00Z"));

        mockMvc.perform(get("/api/v1/admin/timetable-messages")
                        .param("status", "SENT")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingCount").value(0))
                .andExpect(jsonPath("$.messages", hasSize(1)));
    }

    private String create() throws Exception {
        String created = mockMvc.perform(post("/api/v1/timetables")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"profile": %s, "setting": %s}
                                """.formatted(profile(), setting())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.manageKey").value(matchesPattern("[A-Za-z0-9_-]{22}")))
                .andExpect(jsonPath("$.timetable.status").value("DRAFT"))
                .andExpect(jsonPath("$.timetable.organizerPhone").value("010-9999-0000"))
                .andExpect(jsonPath("$.timetable.windows[0].startTime").value("10:00:00"))
                .andExpect(jsonPath("$.timetable.selfChangeNoticeHours").value(24))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.manageKey");
    }

    private String profile() {
        return """
                {"title": "남극장 2차 오디션", "organizerName": "남극장", "organizerPhone": "010-9999-0000",
                 "location": "남극장 연습실", "guide": "대본 지참"}""";
    }

    private String setting() {
        return """
                {"slotMinutes": 30, "slotCapacity": 1, "windows": [
                  {"date": "2026-10-10", "startTime": "10:00", "endTime": "11:30"}
                ]}""";
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedTimetableApiClock() {
            return Clock.fixed(Instant.parse("2026-10-03T01:00:00Z"), ZoneOffset.UTC);
        }
    }
}
