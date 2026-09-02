package art.yesulin.presentation.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.screening.ScreeningCompletion;
import art.yesulin.domain.screening.ScreeningCompletionRepository;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.AuditionSnapshot;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import art.yesulin.domain.submission.QuestionAnswer;
import art.yesulin.domain.submission.QuestionAnswers;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.SelectedRoles;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionCareer;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import art.yesulin.support.ObjectStorageTestConfiguration;
import at.favre.lib.crypto.bcrypt.BCrypt;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class AdminSubmissionControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(99L, MemberType.ADMIN, MemberStatus.ACTIVE);
    private static final long APPLICANT_ID = 10L;
    private static final long PRODUCER_ID = 20L;
    private static final long AUDITION_ID = 30L;
    private static final long ROLE_ID = 40L;
    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-30T01:00:00Z");

    @DynamicPropertySource
    static void registerAdminDeletionPassword(DynamicPropertyRegistry registry) {
        registry.add("yesulin.admin.deletion-password-hash", () -> BCrypt.withDefaults()
                .hashToString(10, "password".toCharArray()));
    }

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private SubmissionRepository submissionRepository;
    @Autowired
    private SubmissionConsentRepository consentRepository;
    @Autowired
    private ScreeningReviewRepository reviewRepository;
    @Autowired
    private ScreeningCompletionRepository completionRepository;
    @Autowired
    private FileAssetRepository fileAssetRepository;
    @Autowired
    private FileReferenceRepository fileReferenceRepository;
    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Test
    void findAllReturnsAuditionsSubmissionsWhenAdminIsAuthenticated() throws Exception {
        // given
        Submission submission = saveSubmission();

        // when & then
        mockMvc.perform(get("/api/v1/admin/auditions/{auditionId}/submissions",
                        submission.getAuditionSnapshot().publicAuditionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions.length()").value(1))
                .andExpect(jsonPath("$.submissions[0].submissionId")
                        .value(submission.getSubmissionId().toString()))
                .andExpect(jsonPath("$.submissions[0].applicantName").value("김하린"))
                .andExpect(jsonPath("$.submissions[0].selectedRoles[0].roleName").value("주연"));
    }

    @Test
    void findReturnsCompleteSubmissionWhenAdminIsAuthenticated() throws Exception {
        // given
        Submission submission = saveSubmission();
        consentRepository.save(SubmissionConsent.agreeToPrivacyCollectionAndUse(
                submission.getSubmissionId(), APPLICANT_ID, "privacy-v1", SUBMITTED_AT
        ));

        // when & then
        mockMvc.perform(get("/api/v1/admin/submissions/{submissionId}", submission.getSubmissionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissionId").value(submission.getSubmissionId().toString()))
                .andExpect(jsonPath("$.applicant.basicInformation.name").value("김하린"))
                .andExpect(jsonPath("$.formAnswers.questionAnswers[0].answer").value("지원합니다."))
                .andExpect(jsonPath("$.consents.length()").value(1));
    }

    @Test
    void deleteRemovesSubmissionRelationsAndKeepsFileAssetWhenPasswordMatches() throws Exception {
        // given
        Submission submission = saveSubmission();
        long fileId = submission.getFormAnswers().photoRequirementAnswers().values().getFirst().fileId();
        fileReferenceRepository.save(new FileReference("SUBMISSION_PHOTO", submission.getId(), fileId));
        consentRepository.save(SubmissionConsent.agreeToPrivacyCollectionAndUse(
                submission.getSubmissionId(), APPLICANT_ID, "privacy-v1", SUBMITTED_AT
        ));
        reviewRepository.save(new ScreeningReview(submission.getSubmissionId(), ROLE_ID, 50L));
        completionRepository.save(new ScreeningCompletion(ROLE_ID, 50L, SUBMITTED_AT));

        // when
        mockMvc.perform(delete("/api/v1/admin/submissions/{submissionId}", submission.getSubmissionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"confirmationPassword": "password"}
                                """))
                .andExpect(status().isNoContent());

        // then
        assertFalse(submissionRepository.existsById(submission.getId()));
        assertEquals(0, consentRepository.count());
        assertEquals(0, reviewRepository.count());
        assertEquals(0, completionRepository.count());
        assertEquals(0, fileReferenceRepository.count());
        assertTrue(fileAssetRepository.existsById(fileId));
        assertEquals(AdminAction.SUBMISSION_DELETED, auditLogRepository.findAll().getFirst().getAction());
    }

    @Test
    void deleteRejectsRequestWithoutChangesWhenPasswordDoesNotMatch() throws Exception {
        // given
        Submission submission = saveSubmission();

        // when
        mockMvc.perform(delete("/api/v1/admin/submissions/{submissionId}", submission.getSubmissionId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"confirmationPassword": "wrong-password"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ADMIN_DELETION_CONFIRMATION_FAILED"));

        // then
        assertTrue(submissionRepository.existsById(submission.getId()));
        assertEquals(0, auditLogRepository.count());
    }

    private Submission saveSubmission() {
        long photoFileId = saveReadyFile("private/actor-photos", APPLICANT_ID);
        long posterFileId = saveReadyFile("public/files", PRODUCER_ID);
        Submission submission = new Submission(
                APPLICANT_ID,
                SUBMITTED_AT,
                new AuditionSnapshot(
                        AUDITION_ID, UUID.randomUUID(), "햄릿 오디션", "햄릿", "테스트 극단",
                        posterFileId, PRODUCER_ID
                ),
                new ApplicantSnapshot(
                        new SubmissionBasicInformation(
                                "김하린", 165, 50, LocalDate.of(1999, 4, 3), SubmissionGender.FEMALE,
                                "010-1234-5678", "harin@example.com", "서울"
                        ),
                        new SubmissionAdditionalInformation(
                                "예술대학교", List.of(), "대한민국", "소개", "연기", "독서",
                                MilitaryServiceStatus.NOT_APPLICABLE,
                                List.of(new SubmissionCareer(2025, "리어왕", "코델리아"))
                        ),
                        new SubmissionFieldSnapshot(List.of(), List.of()),
                        SUBMITTED_AT,
                        SUBMITTED_AT.plusSeconds(86_400)
                ),
                new SelectedRoles(List.of(new SelectedRole(ROLE_ID, "주연"))),
                new SubmissionFormAnswers(
                        new QuestionAnswers(List.of(new QuestionAnswer(60L, "지원 동기", "지원합니다."))),
                        new PhotoRequirementAnswers(List.of(new PhotoRequirementAnswer(70L, "정면", photoFileId))),
                        new VideoRequirementAnswers(List.of())
                )
        );
        return submissionRepository.saveAndFlush(submission);
    }

    private long saveReadyFile(String prefix, long ownerId) {
        FileAsset file = new FileAsset(
                prefix + "/20260830/" + UUID.randomUUID(), ownerId,
                new FileMetadata("image.jpg", "image/jpeg", 100L)
        );
        file.completeUpload("image/jpeg", 100L);
        return fileAssetRepository.saveAndFlush(file).getId();
    }
}
