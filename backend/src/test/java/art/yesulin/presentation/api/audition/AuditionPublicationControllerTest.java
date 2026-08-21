package art.yesulin.presentation.api.audition;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.form.AdditionalQuestionPlans;
import art.yesulin.domain.audition.form.ApplicationFields;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirementPlans;
import art.yesulin.domain.audition.form.VideoRequirementPlans;
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
import art.yesulin.presentation.api.auth.AuthRole;
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
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-publication-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AuditionPublicationControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID, AuthRole.PRODUCER);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionFormRepository formRepository;

    @BeforeEach
    void cleanUp() {
        formRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
    }

    @Test
    void publishesCompleteDraft() throws Exception {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2100, 10, 1), null)
        ));
        saveRoleSection(audition.getId());
        saveSchedule(audition.getId());
        saveForm(audition.getId());

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/publication", audition.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.publishedAt").isString());
    }

    private void saveRoleSection(long auditionId) {
        AuditionRoleCondition condition = new AuditionRoleCondition(1, RoleGender.ANY, 0, 100);
        AuditionRoleSelections selections = new AuditionRoleSelections(
                false, List.of(new AuditionRoleSelection(1L, condition))
        );
        roleSectionRepository.save(new AuditionRoleSection(auditionId, selections));
    }

    private void saveSchedule(long auditionId) {
        RecruitmentPeriod period = new RecruitmentPeriod(
                Instant.parse("2100-09-01T00:00:00Z"), Instant.parse("2100-09-10T00:00:00Z")
        );
        ScreeningStagePlans stages = new ScreeningStagePlans(List.of(
                new ScreeningStagePlan(null, "1차 오디션", LocalDate.of(2100, 9, 12), "")
        ));
        scheduleRepository.save(new AuditionSchedule(auditionId, new AuditionSchedulePlan(period, stages)));
    }

    private void saveForm(long auditionId) {
        AuditionFormPlan plan = new AuditionFormPlan(
                new ApplicationFields(List.of(BasicInformationField.NAME), List.of()),
                new PhotoRequirementPlans(List.of()),
                new VideoRequirementPlans(List.of()),
                new AdditionalQuestionPlans(List.of())
        );
        formRepository.save(new AuditionForm(auditionId, plan));
    }
}
