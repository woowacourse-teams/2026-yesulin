package art.yesulin.presentation.api.submission;

import static org.hamcrest.Matchers.matchesPattern;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionConsentType;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
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
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({
        ObjectStorageTestConfiguration.class,
        SubmissionControllerTest.FixedClockConfiguration.class
})
@AutoConfigureMockMvc
class SubmissionControllerTest {

    private static final long APPLICANT_ID = 1L;
    private static final long REQUEST_APPLICANT_ID = 999L;
    private static final long PRODUCER_ID = 2L;
    private static final Instant NOW = Instant.parse("2026-08-24T03:15:00Z");
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(APPLICANT_ID);

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private SubmissionRepository submissionRepository;
    @Autowired
    private SubmissionConsentRepository consentRepository;
    @Autowired
    private FileReferenceRepository fileReferenceRepository;
    @Autowired
    private FileAssetRepository fileAssetRepository;
    @Autowired
    private AuditionFormRepository formRepository;
    @Autowired
    private AuditionScheduleRepository scheduleRepository;
    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;
    @Autowired
    private AuditionRepository auditionRepository;
    @Autowired
    private PerformanceRepository performanceRepository;

    @BeforeEach
    void cleanUp() {
        fileReferenceRepository.deleteAll();
        consentRepository.deleteAll();
        submissionRepository.deleteAll();
        formRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void submitsUsingApplicantIdFromSession() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));

        String responseBody = mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestWithApplicantId(fixture.roleId())))
                .andExpect(status().isCreated())
                .andExpect(header().string(
                        "Location",
                        matchesPattern("/api/v1/applicants/me/submissions/[0-9a-f-]{36}")
                ))
                .andExpect(jsonPath("$.submissionId").isString())
                .andExpect(jsonPath("$.submittedAt").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        UUID submissionId = UUID.fromString(objectMapper.readTree(responseBody).get("submissionId").asText());
        Submission submission = submissionRepository.findBySubmissionId(submissionId).orElseThrow();
        List<SubmissionConsent> consents = consentRepository.findAllBySubmissionId(submissionId);
        assertEquals(APPLICANT_ID, submission.getApplicantId());
        assertEquals(2, consents.size());
        assertEquals(
                "mvp-privacy-placeholder-v0",
                findConsent(consents, SubmissionConsentType.PRIVACY_COLLECTION_AND_USE).getDocumentVersion()
        );
        assertEquals(
                "mvp-third-party-placeholder-v0",
                findConsent(consents, SubmissionConsentType.THIRD_PARTY_PROVISION).getDocumentVersion()
        );
    }

    @Test
    void rejectsInvalidRequest() throws Exception {
        UUID auditionId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", auditionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.detail.selectedRoleIds").exists());
    }

    @Test
    void rejectsSubmissionAfterRecruitmentCloses() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(172_800), NOW);

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(fixture.roleId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RECRUITMENT_CLOSED"));
    }

    @Test
    void rejectsDuplicateSubmission() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));

        submit(fixture);

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(fixture.roleId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_SUBMISSION"));
    }

    private void submit(AuditionFixture fixture) throws Exception {
        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(fixture.roleId())))
                .andExpect(status().isCreated());
    }

    private SubmissionConsent findConsent(
            List<SubmissionConsent> consents,
            SubmissionConsentType consentType
    ) {
        return consents.stream()
                .filter(consent -> consent.getConsentType() == consentType)
                .findFirst()
                .orElseThrow();
    }

    private AuditionFixture saveAudition(Instant recruitmentStartAt, Instant recruitmentEndAt) {
        Performance performance = savePerformance();
        long performanceRoleId = performance.getRoles().getFirst().getId();
        Audition audition = new Audition(
                performance.getId(),
                PRODUCER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        );
        audition.publish(NOW.minusSeconds(172_800));
        auditionRepository.saveAndFlush(audition);
        AuditionRoleSection roleSection = roleSectionRepository.saveAndFlush(new AuditionRoleSection(
                audition.getId(),
                new AuditionRoleSelections(false, List.of(new AuditionRoleSelection(
                        performanceRoleId,
                        new AuditionRoleCondition(1, RoleGender.ANY, 0, 100)
                )))
        ));
        scheduleRepository.saveAndFlush(new AuditionSchedule(
                audition.getId(),
                new AuditionSchedulePlan(
                        new RecruitmentPeriod(recruitmentStartAt, recruitmentEndAt),
                        new ScreeningStagePlans(List.of(new ScreeningStagePlan(
                                null, "1차 오디션", LocalDate.of(2026, 9, 10), ""
                        )))
                )
        ));
        formRepository.saveAndFlush(new AuditionForm(
                audition.getId(),
                new AuditionFormPlan(
                        new ApplicationFields(List.of(), List.of()),
                        new PhotoRequirementPlans(List.of()),
                        new VideoRequirementPlans(List.of()),
                        new AdditionalQuestionPlans(List.of())
                )
        ));
        return new AuditionFixture(audition.getPublicId(), roleSection.getRoles().getFirst().getId());
    }

    private Performance savePerformance() {
        long posterFileId = saveReadyImage(PRODUCER_ID, "performances/poster.jpg");
        Performance performance = new Performance(
                PRODUCER_ID, posterFileId, "햄릿", "서울특별시 종로구"
        );
        performance.addRole("햄릿", "덴마크의 왕자");
        return performanceRepository.saveAndFlush(performance);
    }

    private long saveReadyImage(long ownerId, String objectKey) {
        FileAsset file = new FileAsset(
                objectKey,
                ownerId,
                new FileMetadata("profile.jpg", "image/jpeg", 1_024L)
        );
        file.completeUpload("image/jpeg", 1_024L);
        return fileAssetRepository.saveAndFlush(file).getId();
    }

    private String requestWithApplicantId(long roleId) {
        return validRequest(roleId).replaceFirst(
                "\\{",
                "{\n  \"applicantId\": " + REQUEST_APPLICANT_ID + ","
        );
    }

    private String validRequest(long roleId) {
        return """
                {
                  "basicInformation": {},
                  "additionalInformation": {"links": [], "careers": []},
                  "selectedRoleIds": [%d],
                  "formAnswers": {
                    "questionAnswers": [],
                    "photoRequirementAnswers": [],
                    "videoRequirementAnswers": []
                  },
                  "consents": {
                    "privacyCollectionAndUseAgreed": true,
                    "thirdPartyProvisionAgreed": true
                  }
                }
                """.formatted(roleId);
    }

    private String invalidRequest() {
        return """
                {
                  "basicInformation": {},
                  "additionalInformation": {"links": [], "careers": []},
                  "selectedRoleIds": [],
                  "formAnswers": {
                    "questionAnswers": [],
                    "photoRequirementAnswers": [],
                    "videoRequirementAnswers": []
                  },
                  "consents": {
                    "privacyCollectionAndUseAgreed": true,
                    "thirdPartyProvisionAgreed": true
                  }
                }
                """;
    }

    private record AuditionFixture(UUID auditionId, long roleId) {
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }
}
