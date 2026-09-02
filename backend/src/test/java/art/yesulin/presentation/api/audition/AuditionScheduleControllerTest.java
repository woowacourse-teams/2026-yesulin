package art.yesulin.presentation.api.audition;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-schedule-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AuditionScheduleControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER,
            MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @BeforeEach
    void cleanUp() {
        scheduleRepository.deleteAll();
        auditionRepository.deleteAll();
    }

    @Test
    void savesAndFindsSchedule() throws Exception {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        String request = """
                {
                  "recruitmentEndAt": "2026-09-10T18:00:00+09:00",
                  "stages": [
                    {
                      "name": "1차 실기",
                      "date": "2026-09-12",
                      "notice": "A관"
                    }
                  ]
                }
                """;

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/schedule", audition.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recruitmentStartAt").isEmpty())
                .andExpect(jsonPath("$.stages[0].id").isNumber())
                .andExpect(jsonPath("$.stages[0].order").value(1))
                .andExpect(jsonPath("$.stages[0].name").value("1차 실기"));

        mockMvc.perform(get("/api/v1/auditions/{auditionId}/schedule", audition.getPublicId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recruitmentEndAt").value("2026-09-10T09:00:00Z"))
                .andExpect(jsonPath("$.stages[0].notice").value("A관"));
    }

    @Test
    void rejectsFirstStageOnRecruitmentEndDate() throws Exception {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        String request = """
                {
                  "recruitmentEndAt": "2026-09-10T18:00:00+09:00",
                  "stages": [
                    {"name": "1차 실기", "date": "2026-09-10", "notice": "A관"}
                  ]
                }
                """;

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/schedule", audition.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUDITION_INVALID_SCHEDULE"))
                .andExpect(jsonPath("$.message").value("1차 전형일은 모집 마감 다음 날부터 설정할 수 있습니다."));
    }
}
