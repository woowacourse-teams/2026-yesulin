package art.yesulin.presentation.api.screening;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSelection;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import art.yesulin.domain.audition.schedule.ScreeningStagePlans;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-review-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class ScreeningReviewControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ScreeningReviewRepository screeningReviewRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    private long roleId;

    @BeforeEach
    void setUp() {
        screeningReviewRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        roleId = saveScreeningFixture();
    }

    @Test
    void savesReview() throws Exception {
        String request = """
                {
                  "submissionIds": ["b4472dce-52d0-41a9-baaa-c9e86e31b72b"],
                  "status": "etc",
                  "memo": "추가 논의",
                  "note": "발성 확인 필요"
                }
                """;

        mockMvc.perform(patch("/api/v1/audition-roles/{roleId}/screening-rounds/{round}/reviews", roleId, 1)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews[0].submissionId")
                        .value("b4472dce-52d0-41a9-baaa-c9e86e31b72b"))
                .andExpect(jsonPath("$.reviews[0].status").value("ETC"))
                .andExpect(jsonPath("$.reviews[0].memo").value("추가 논의"))
                .andExpect(jsonPath("$.reviews[0].note").value("발성 확인 필요"));
    }

    private long saveScreeningFixture() {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        AuditionRoleSection roleSection = roleSectionRepository.save(new AuditionRoleSection(
                audition.getId(),
                new AuditionRoleSelections(false, List.of(new AuditionRoleSelection(
                        1L, new AuditionRoleCondition(1, RoleGender.ANY, 0, 100)
                )))
        ));
        scheduleRepository.save(new AuditionSchedule(
                audition.getId(),
                new AuditionSchedulePlan(
                        new RecruitmentPeriod(
                                Instant.parse("2026-09-01T00:00:00Z"),
                                Instant.parse("2026-09-10T00:00:00Z")
                        ),
                        new ScreeningStagePlans(List.of(
                                new ScreeningStagePlan(null, "1차 서류", LocalDate.of(2026, 9, 12), "")
                        ))
                )
        ));
        return roleSection.getRoles().getFirst().getId();
    }
}
