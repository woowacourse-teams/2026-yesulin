package art.yesulin.presentation.api.submission;

import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.application.photolibrary.PhotoLibraryService;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
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
import art.yesulin.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionBasicInformationField;
import art.yesulin.domain.submission.SubmissionCareer;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.domain.submission.VideoRequirementAnswer;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:applicant-submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class ApplicantSubmissionControllerTest {

    private static final long APPLICANT_ID = 1L;
    private static final long PRODUCER_ID = 2L;
    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-24T03:15:00Z");
    private static final Instant RECRUITMENT_END_AT = Instant.parse("2026-08-31T14:59:00Z");
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(
            APPLICANT_ID, MemberType.APPLICANT, MemberStatus.ACTIVE
    );
    private static final String SUBMISSIONS_PATH = "/api/v1/applicants/me/submissions";
    private static final String SUBMISSION_PHOTO_REFERENCE_TYPE = "SUBMISSION_PHOTO";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private SubmissionRepository submissionRepository;
    @Autowired
    private SubmissionConsentRepository consentRepository;
    @Autowired
    private FileAssetRepository fileAssetRepository;
    @Autowired
    private FileReferenceRepository fileReferenceRepository;
    @Autowired
    private PhotoLibraryService photoLibraryService;

    @Test
    void findsOnlySessionApplicantsSubmissionSummariesInRecentOrder() throws Exception {
        Submission older = saveSubmission(
                APPLICANT_ID, 2L, SUBMITTED_AT.minusSeconds(60), saveReadyPhoto(APPLICANT_ID)
        );
        Submission newer = saveSubmission(
                APPLICANT_ID, 3L, SUBMITTED_AT, saveReadyPhoto(APPLICANT_ID)
        );
        saveSubmission(2L, 4L, SUBMITTED_AT.plusSeconds(60), saveReadyPhoto(2L));

        mockMvc.perform(get(SUBMISSIONS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions.length()").value(2))
                .andExpect(jsonPath("$.submissions[0].submissionId").value(newer.getSubmissionId().toString()))
                .andExpect(jsonPath("$.submissions[0].auditionId").value(
                        newer.getAuditionSnapshot().publicAuditionId().toString()
                ))
                .andExpect(jsonPath("$.submissions[0].performanceTitle").value("공연 3"))
                .andExpect(jsonPath("$.submissions[0].auditionTitle").value("공고 3"))
                .andExpect(jsonPath("$.submissions[0].companyName").value("테스트 극단"))
                .andExpect(jsonPath("$.submissions[0].posterUrl").value(startsWith("https://cdn.test/assets/")))
                .andExpect(jsonPath("$.submissions[0].selectedRoles[0].roleName").value("배역 3"))
                .andExpect(jsonPath("$.submissions[1].submissionId").value(older.getSubmissionId().toString()))
                .andExpect(jsonPath("$.submissions[0].applicant").doesNotExist())
                .andExpect(jsonPath("$.submissions[0].formAnswers").doesNotExist());
    }

    @Test
    void findsCompleteSubmissionSnapshotAfterPhotoLibrarySoftDelete() throws Exception {
        long fileId = saveReadyPhoto(APPLICANT_ID);
        PhotoLibraryItemResult libraryPhoto = photoLibraryService.addPhoto(
                APPLICANT_ID, new AddPhotoToLibraryCommand(fileId)
        );
        Submission submission = saveSubmission(APPLICANT_ID, 2L, SUBMITTED_AT, fileId);
        saveSubmissionPhotoReference(submission, fileId);
        saveConsents(submission);
        photoLibraryService.deletePhoto(APPLICANT_ID, libraryPhoto.id());
        assertTrue(fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(
                SUBMISSION_PHOTO_REFERENCE_TYPE, submission.getId(), fileId
        ));

        mockMvc.perform(get(SUBMISSIONS_PATH + "/{submissionId}", submission.getSubmissionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissionId").value(submission.getSubmissionId().toString()))
                .andExpect(jsonPath("$.auditionId").value(
                        submission.getAuditionSnapshot().publicAuditionId().toString()
                ))
                .andExpect(jsonPath("$.performanceTitle").value("공연 2"))
                .andExpect(jsonPath("$.auditionTitle").value("공고 2"))
                .andExpect(jsonPath("$.companyName").value("테스트 극단"))
                .andExpect(jsonPath("$.posterUrl").value(startsWith("https://cdn.test/assets/")))
                .andExpect(jsonPath("$.applicant.basicInformation.name").value("김하린"))
                .andExpect(jsonPath("$.applicant.ageAtRecruitmentDeadline").value(27))
                .andExpect(jsonPath("$.applicant.fieldSnapshot.basicFields[0]").value("NAME"))
                .andExpect(jsonPath("$.selectedRoles[0].roleName").value("배역 2"))
                .andExpect(jsonPath("$.formAnswers.questionAnswers[0].question").value("지원 동기"))
                .andExpect(jsonPath("$.formAnswers.photoRequirementAnswers[0].fileId").value(fileId))
                .andExpect(jsonPath("$.formAnswers.photoRequirementAnswers[0].url").value(
                        "/api/v1/files/" + fileId + "/content"
                ))
                .andExpect(jsonPath("$.formAnswers.videoRequirementAnswers[0].url").value(
                        "https://youtu.be/abcdefghijk"
                ))
                .andExpect(jsonPath("$.consents.length()").value(2))
                .andExpect(jsonPath("$.consents[1].recipientName").value("테스트 극단"));
    }

    @Test
    void hidesAnotherApplicantsSubmissionAsNotFound() throws Exception {
        Submission submission = saveSubmission(2L, 2L, SUBMITTED_AT, 41L);

        mockMvc.perform(get(SUBMISSIONS_PATH + "/{submissionId}", submission.getSubmissionId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SUBMISSION_NOT_FOUND"));
    }

    private Submission saveSubmission(long applicantId, long auditionId, Instant submittedAt, long fileId) {
        Submission submission = new Submission(
                applicantId,
                submittedAt,
                new AuditionSnapshot(
                        auditionId,
                        java.util.UUID.randomUUID(),
                        "공고 " + auditionId,
                        "공연 " + auditionId,
                        "테스트 극단",
                        saveReadyPoster(),
                        PRODUCER_ID
                ),
                createApplicantSnapshot(submittedAt),
                new SelectedRoles(List.of(new SelectedRole(auditionId * 10, "배역 " + auditionId))),
                createFormAnswers(fileId)
        );
        return submissionRepository.saveAndFlush(submission);
    }

    private ApplicantSnapshot createApplicantSnapshot(Instant submittedAt) {
        return new ApplicantSnapshot(
                new SubmissionBasicInformation(
                        "김하린", 165, 50, LocalDate.of(1999, 4, 3), SubmissionGender.FEMALE,
                        "010-1234-5678", "harin@example.com", "서울특별시 종로구"
                ),
                new SubmissionAdditionalInformation(
                        "한국예술종합학교",
                        List.of("https://example.com/profile"),
                        "대한민국",
                        "자기소개",
                        "현대무용",
                        "영화 감상",
                        MilitaryServiceStatus.NOT_APPLICABLE,
                        List.of(new SubmissionCareer(2025, "햄릿", "오필리어"))
                ),
                new SubmissionFieldSnapshot(
                        List.of(SubmissionBasicInformationField.NAME),
                        List.of(SubmissionAdditionalInformationField.LINK)
                ),
                submittedAt,
                RECRUITMENT_END_AT
        );
    }

    private SubmissionFormAnswers createFormAnswers(long fileId) {
        return new SubmissionFormAnswers(
                new QuestionAnswers(List.of(new QuestionAnswer(21L, "지원 동기", "작품에 공감했습니다."))),
                new PhotoRequirementAnswers(List.of(new PhotoRequirementAnswer(31L, "정면 사진", fileId))),
                new VideoRequirementAnswers(List.of(new VideoRequirementAnswer(
                        51L, "자유 연기", "https://youtu.be/abcdefghijk"
                )))
        );
    }

    private long saveReadyPhoto(long ownerId) {
        FileAsset file = new FileAsset(
                "private/actor-photos/20260826/" + java.util.UUID.randomUUID(),
                ownerId,
                new FileMetadata("profile.jpg", "image/jpeg", 1_024L)
        );
        file.completeUpload("image/jpeg", 1_024L);
        return fileAssetRepository.saveAndFlush(file).getId();
    }

    private long saveReadyPoster() {
        FileAsset file = new FileAsset(
                "public/files/20260826/" + java.util.UUID.randomUUID(),
                PRODUCER_ID,
                new FileMetadata("poster.jpg", "image/jpeg", 1_024L)
        );
        file.completeUpload("image/jpeg", 1_024L);
        return fileAssetRepository.saveAndFlush(file).getId();
    }

    private void saveSubmissionPhotoReference(Submission submission, long fileId) {
        fileReferenceRepository.save(new FileReference(
                SUBMISSION_PHOTO_REFERENCE_TYPE,
                submission.getId(),
                fileId
        ));
    }

    private void saveConsents(Submission submission) {
        consentRepository.saveAll(List.of(
                SubmissionConsent.agreeToPrivacyCollectionAndUse(
                        submission.getSubmissionId(), APPLICANT_ID, "privacy-v1", SUBMITTED_AT
                ),
                SubmissionConsent.agreeToThirdPartyProvision(
                        submission.getSubmissionId(), APPLICANT_ID, "third-party-v1", "테스트 극단", SUBMITTED_AT
                )
        ));
    }
}
