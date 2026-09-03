package art.yesulin.presentation.api.submission;

import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
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
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(
            APPLICANT_ID, MemberType.APPLICANT, MemberStatus.ACTIVE
    );

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
    @Autowired
    private ProducerRepository producerRepository;

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
        producerRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void submitsUsingApplicantIdFromSession() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));

        String responseBody = mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
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
    void submittedApplicationCanBeReadFromListAndDetail() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));

        String responseBody = mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(fixture.roleId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String submissionId = objectMapper.readTree(responseBody).get("submissionId").asText();

        mockMvc.perform(get("/api/v1/applicants/me/submissions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions.length()").value(1))
                .andExpect(jsonPath("$.submissions[0].submissionId").value(submissionId))
                .andExpect(jsonPath("$.submissions[0].auditionId").value(fixture.auditionId().toString()))
                .andExpect(jsonPath("$.submissions[0].performanceTitle").value("햄릿"))
                .andExpect(jsonPath("$.submissions[0].auditionTitle").value("햄릿 오디션"))
                .andExpect(jsonPath("$.submissions[0].companyName").value("테스트 극단"))
                .andExpect(jsonPath("$.submissions[0].posterUrl").value(startsWith("https://cdn.test/assets/")))
                .andExpect(jsonPath("$.submissions[0].selectedRoles[0].roleName").value("햄릿"));

        mockMvc.perform(get("/api/v1/applicants/me/submissions/{submissionId}", submissionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissionId").value(submissionId))
                .andExpect(jsonPath("$.auditionId").value(fixture.auditionId().toString()))
                .andExpect(jsonPath("$.performanceTitle").value("햄릿"))
                .andExpect(jsonPath("$.auditionTitle").value("햄릿 오디션"))
                .andExpect(jsonPath("$.companyName").value("테스트 극단"))
                .andExpect(jsonPath("$.posterUrl").value(startsWith("https://cdn.test/assets/")))
                .andExpect(jsonPath("$.selectedRoles[0].roleName").value("햄릿"))
                .andExpect(jsonPath("$.consents.length()").value(2));
    }

    @Test
    void rejectsInvalidRequest() throws Exception {
        UUID auditionId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", auditionId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
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
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
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
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(fixture.roleId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_SUBMISSION"));
    }

    @Test
    void rejectsProducerWithForbidden() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", UUID.randomUUID())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsUnauthenticatedSubmission() throws Exception {
        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", UUID.randomUUID())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void returnsSameSubmissionWhenSameIdempotencyKeyIsRetried() throws Exception {
        // given
        AuditionFixture fixture = saveAudition(
                NOW.minusSeconds(86_400),
                NOW.plusSeconds(86_400)
        );
        UUID idempotencyKey = UUID.randomUUID();
        String requestBody = validRequest(fixture.roleId());

        // when
        String firstResponse = mockMvc.perform(
                        post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                                .with(csrf())
                                .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                                .header("Idempotency-Key", idempotencyKey.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String secondResponse = mockMvc.perform(
                        post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                                .with(csrf())
                                .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                                .header("Idempotency-Key", idempotencyKey.toString())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                )
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        // then
        String firstSubmissionId = objectMapper.readTree(firstResponse)
                .get("submissionId").asString();
        String secondSubmissionId = objectMapper.readTree(secondResponse)
                .get("submissionId").asString();

        assertEquals(firstSubmissionId, secondSubmissionId);
        assertEquals(1L, submissionRepository.count());
    }

    @Test
    void rejectsDifferentRequestUsingSameIdempotencyKey() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));
        UUID idempotencyKey = UUID.randomUUID();
        String requestBody = validRequest(fixture.roleId());
        String changedRequestBody = requestBody.replace(
                "\"basicInformation\": {}",
                "\"basicInformation\": {\"name\": \"다른 이름\"}"
        );

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", idempotencyKey.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", idempotencyKey.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(changedRequestBody))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));

        assertEquals(1L, submissionRepository.count());
    }

    @Test
    void rejectsSubmissionWithoutIdempotencyKey() throws Exception {
        AuditionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));

        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validRequest(fixture.roleId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    private void submit(AuditionFixture fixture) throws Exception {
        mockMvc.perform(post("/api/v1/auditions/{auditionId}/submissions", fixture.auditionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
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
        long posterFileId = saveReadyImage(PRODUCER_ID, "public/files/20260826/poster.jpg");
        producerRepository.saveAndFlush(new Producer(PRODUCER_ID, "테스트 극단", "01012345678"));
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
