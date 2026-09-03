package art.yesulin.application.submission;

import static art.yesulin.domain.submission.SubmissionErrorCode.DUPLICATE_SUBMISSION;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.common.exception.ErrorCode;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.form.AdditionalQuestionPlans;
import art.yesulin.domain.audition.form.ApplicationFields;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormPlan;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.form.PhotoRequirementPlan;
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
import art.yesulin.domain.file.FileErrorCode;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionConsent;
import art.yesulin.domain.submission.SubmissionConsentRepository;
import art.yesulin.domain.submission.SubmissionConsentType;
import art.yesulin.domain.submission.SubmissionErrorCode;
import art.yesulin.domain.submission.SubmissionIdempotencyRequestRepository;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission-service;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({
        ObjectStorageTestConfiguration.class,
        SubmissionServiceTest.FixedClockConfiguration.class
})
class SubmissionServiceTest {

    private static final long APPLICANT_ID = 1L;
    private static final long PRODUCER_ID = 2L;
    private static final Instant NOW = Instant.parse("2026-08-23T03:15:00Z");

    @Autowired
    private SubmissionService submissionService;
    @Autowired
    private IdempotentSubmissionService idempotentSubmissionService;
    @MockitoSpyBean
    private SubmissionRepository submissionRepository;
    @Autowired
    private SubmissionIdempotencyRequestRepository idempotencyRepository;
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
    @MockitoSpyBean
    private SubmissionConsentDocumentProvider consentDocumentProvider;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoSpyBean
    private SubmissionConsentWriter consentWriter;
    @MockitoSpyBean
    private SubmissionPhotoReferenceWriter photoReferenceWriter;
    @MockitoSpyBean
    private SubmissionPosterReferenceWriter posterReferenceWriter;

    private ExecutorService executor;

    @BeforeEach
    void setUp() {
        executor = Executors.newFixedThreadPool(2);
        cleanDatabase();
    }

    @AfterEach
    void tearDown() {
        executor.shutdownNow();
    }

    @Test
    void submitsSnapshotConsentsAndPhotoReferencesInOneTransaction() {
        SubmissionFixture fixture = saveOpenAudition();

        SubmittedSubmissionResult result = submissionService.submit(
                APPLICANT_ID, fixture.publicAuditionId(), fixture.command()
        );

        StoredSubmission submission = readSubmission(result.submissionId());
        final List<SubmissionConsent> consents = consentRepository.findAllBySubmissionId(result.submissionId());
        assertEquals(NOW, result.submittedAt());
        assertEquals("햄릿 오디션", submission.auditionTitle());
        assertEquals(List.of("햄릿"), submission.roleNames());
        assertEquals(List.of("정면 사진", "측면 사진"), submission.photoDescriptions());
        assertEquals(2, consents.size());
        assertEquals(List.of(NOW), consents.stream().map(SubmissionConsent::getAgreedAt).distinct().toList());
        SubmissionConsent privacyConsent = findConsent(
                consents, SubmissionConsentType.PRIVACY_COLLECTION_AND_USE
        );
        SubmissionConsent thirdPartyConsent = findConsent(
                consents, SubmissionConsentType.THIRD_PARTY_PROVISION
        );
        assertEquals("mvp-privacy-placeholder-v0", privacyConsent.getDocumentVersion());
        assertEquals("mvp-third-party-placeholder-v0", thirdPartyConsent.getDocumentVersion());
        assertEquals("MVP 임시 기획사/제작사", thirdPartyConsent.getRecipientNameSnapshot());
        List<FileReference> submissionReferences = findSubmissionReferences();
        assertEquals(1, submissionReferences.size());
        assertEquals(fixture.fileId(), submissionReferences.getFirst().getFileId());
        assertEquals(submission.id(), submissionReferences.getFirst().getReferenceId());
        List<FileReference> posterReferences = findSubmissionPosterReferences();
        assertEquals(1, posterReferences.size());
        assertEquals(submission.id(), posterReferences.getFirst().getReferenceId());
        verify(consentDocumentProvider).currentFor(submission.auditionId(), NOW);
    }

    @Test
    void rejectsRepeatedSubmissionBeforeSavingAnotherSnapshot() {
        SubmissionFixture fixture = saveOpenAudition();
        submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command())
        );

        assertEquals(DUPLICATE_SUBMISSION, exception.getErrorCode());
        assertStoredSubmissionCounts(1, 2, 1);
    }

    @Test
    void convertsDatabaseUniqueViolationToDuplicateSubmissionError() {
        SubmissionFixture fixture = saveOpenAudition();
        submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command());
        doReturn(false).when(submissionRepository)
                .existsByApplicantIdAndAuditionId(anyLong(), anyLong());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command())
        );

        assertEquals(DUPLICATE_SUBMISSION, exception.getErrorCode());
        assertStoredSubmissionCounts(1, 2, 1);
    }

    @Test
    void allowsOnlyOneOfConcurrentSubmissionsForSameAudition() throws Exception {
        SubmissionFixture fixture = saveOpenAudition();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch duplicateChecks = new CountDownLatch(2);
        doAnswer(invocation -> {
            duplicateChecks.countDown();
            if (!duplicateChecks.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("두 동시 요청이 모두 사전 중복 검사를 통과하지 못했습니다.");
            }
            return false;
        }).when(submissionRepository).existsByApplicantIdAndAuditionId(anyLong(), anyLong());
        List<Future<SubmissionAttempt>> futures = new ArrayList<>();
        for (int index = 0; index < 2; index++) {
            futures.add(executor.submit(() -> submitAfterSignal(fixture, ready, start)));
        }
        assertTrue(ready.await(5, TimeUnit.SECONDS));
        start.countDown();

        List<SubmissionAttempt> attempts = futures.stream().map(this::getAttempt).toList();

        assertEquals(1, attempts.stream().filter(SubmissionAttempt::succeeded).count());
        assertEquals(1, attempts.stream().filter(attempt -> attempt.errorCode() == DUPLICATE_SUBMISSION).count());
        assertStoredSubmissionCounts(1, 2, 1);
    }

    @Test
    void returnsSameResultForConcurrentRequestsWithSameIdempotencyKey() throws Exception {
        SubmissionFixture fixture = saveOpenAudition();
        UUID idempotencyKey = UUID.randomUUID();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<SubmittedSubmissionResult>> futures = new ArrayList<>();
        for (int index = 0; index < 2; index++) {
            futures.add(executor.submit(() -> {
                ready.countDown();
                start.await();
                return idempotentSubmissionService.submit(
                        APPLICANT_ID,
                        fixture.publicAuditionId(),
                        idempotencyKey,
                        fixture.command()
                );
            }));
        }
        assertTrue(ready.await(5, TimeUnit.SECONDS));
        start.countDown();

        List<SubmittedSubmissionResult> results = futures.stream()
                .map(this::getSubmissionResult)
                .toList();

        assertEquals(results.getFirst().submissionId(), results.getLast().submissionId());
        assertEquals(1L, idempotencyRepository.count());
        assertStoredSubmissionCounts(1, 2, 1);
    }

    @Test
    void rollsBackIdempotencyRequestWhenSubmissionFails() {
        SubmissionFixture fixture = saveAudition(NOW.minusSeconds(86_400), NOW);

        assertThrows(
                BusinessException.class,
                () -> idempotentSubmissionService.submit(
                        APPLICANT_ID,
                        fixture.publicAuditionId(),
                        UUID.randomUUID(),
                        fixture.command()
                )
        );

        assertEquals(0L, idempotencyRepository.count());
        assertStoredSubmissionCounts(0, 0, 0);
    }

    @Test
    void rollsBackSubmissionWhenConsentPersistenceFails() {
        SubmissionFixture fixture = saveOpenAudition();
        doThrow(new IllegalStateException("동의 저장 실패"))
                .when(consentWriter).save(any(), any(), any());

        assertThrows(
                IllegalStateException.class,
                () -> submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command())
        );

        assertStoredSubmissionCounts(0, 0, 0);
    }

    @Test
    void rollsBackSubmissionAndConsentsWhenFileReferencePersistenceFails() {
        SubmissionFixture fixture = saveOpenAudition();
        doThrow(new IllegalStateException("파일 참조 저장 실패"))
                .when(photoReferenceWriter).save(anyLong(), any());

        assertThrows(
                IllegalStateException.class,
                () -> submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command())
        );

        assertStoredSubmissionCounts(0, 0, 0);
    }

    @Test
    void rejectsRoleThatIsNoLongerInCurrentAuditionWithoutPersistence() {
        SubmissionFixture fixture = saveOpenAudition();
        SubmitSubmissionCommand command = withSelectedRoleIds(fixture.command(), List.of(Long.MAX_VALUE));

        assertRejectedWithoutPersistence(
                fixture,
                command,
                SubmissionErrorCode.INVALID_SELECTED_ROLE
        );
    }

    @Test
    void rejectsQuestionPhotoAndVideoIdsThatAreNoLongerInCurrentFormWithoutPersistence() {
        SubmissionFixture fixture = saveOpenAudition();
        SubmitFormAnswersCommand currentAnswers = fixture.command().formAnswers();
        List<SubmitSubmissionCommand> staleCommands = List.of(
                withFormAnswers(fixture.command(), new SubmitFormAnswersCommand(
                        List.of(new SubmitQuestionAnswerCommand(Long.MAX_VALUE, "답변")),
                        currentAnswers.photoRequirementAnswers(),
                        List.of()
                )),
                withFormAnswers(fixture.command(), new SubmitFormAnswersCommand(
                        List.of(),
                        List.of(new SubmitPhotoRequirementAnswerCommand(Long.MAX_VALUE, fixture.fileId())),
                        List.of()
                )),
                withFormAnswers(fixture.command(), new SubmitFormAnswersCommand(
                        List.of(),
                        currentAnswers.photoRequirementAnswers(),
                        List.of(new SubmitVideoRequirementAnswerCommand(
                                Long.MAX_VALUE, "https://youtu.be/abcdefghijk"
                        ))
                ))
        );

        staleCommands.forEach(command -> assertRejectedWithoutPersistence(
                fixture,
                command,
                SubmissionErrorCode.INVALID_FORM_ANSWER
        ));
    }

    @Test
    void rejectsPhotoOwnedByAnotherApplicantWithoutPersistence() {
        SubmissionFixture fixture = saveOpenAudition();
        long anotherApplicantsFileId = saveReadyImage(3L, "submissions/another-applicants-profile.jpg");
        SubmitSubmissionCommand command = withPhotoFile(fixture.command(), anotherApplicantsFileId);

        assertRejectedWithoutPersistence(fixture, command, FileErrorCode.NOT_FOUND);
    }

    @Test
    void rejectsPendingPhotoWithoutPersistence() {
        SubmissionFixture fixture = saveOpenAudition();
        long pendingFileId = savePendingImage(APPLICANT_ID, "submissions/pending-profile.jpg");
        SubmitSubmissionCommand command = withPhotoFile(fixture.command(), pendingFileId);

        assertRejectedWithoutPersistence(fixture, command, FileErrorCode.NOT_READY);
    }

    @Test
    void rejectsMissingPhotoWithoutPersistence() {
        SubmissionFixture fixture = saveOpenAudition();
        SubmitSubmissionCommand command = withPhotoFile(fixture.command(), Long.MAX_VALUE);

        assertRejectedWithoutPersistence(fixture, command, FileErrorCode.NOT_FOUND);
    }

    @Test
    void acceptsSubmissionExactlyAtRecruitmentStart() {
        SubmissionFixture fixture = saveAudition(NOW, NOW.plusSeconds(86_400));

        submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command());

        assertStoredSubmissionCounts(1, 2, 1);
    }

    @Test
    void rejectsBeforeRecruitmentStartAndAtRecruitmentEndWithoutPersistence() {
        SubmissionFixture upcoming = saveAudition(NOW.plusSeconds(60), NOW.plusSeconds(86_400));
        assertRejectedWithoutPersistence(
                upcoming,
                upcoming.command(),
                SubmissionErrorCode.RECRUITMENT_CLOSED
        );
        cleanDatabase();
        SubmissionFixture closed = saveAudition(NOW.minusSeconds(86_400), NOW);

        assertRejectedWithoutPersistence(
                closed,
                closed.command(),
                SubmissionErrorCode.RECRUITMENT_CLOSED
        );
    }

    private SubmissionAttempt submitAfterSignal(
            SubmissionFixture fixture,
            CountDownLatch ready,
            CountDownLatch start
    ) throws InterruptedException {
        ready.countDown();
        start.await();
        try {
            submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), fixture.command());
            return SubmissionAttempt.success();
        } catch (BusinessException exception) {
            return SubmissionAttempt.failure(exception);
        }
    }

    private SubmissionAttempt getAttempt(Future<SubmissionAttempt> future) {
        try {
            return future.get(10, TimeUnit.SECONDS);
        } catch (Exception exception) {
            throw new AssertionError("동시 제출 결과를 확인할 수 없습니다.", exception);
        }
    }

    private SubmittedSubmissionResult getSubmissionResult(Future<SubmittedSubmissionResult> future) {
        try {
            return future.get(10, TimeUnit.SECONDS);
        } catch (Exception exception) {
            throw new AssertionError("동시 멱등 요청 결과를 확인할 수 없습니다.", exception);
        }
    }

    private SubmissionFixture saveOpenAudition() {
        return saveAudition(NOW.minusSeconds(86_400), NOW.plusSeconds(86_400));
    }

    private SubmissionFixture saveAudition(Instant recruitmentStartAt, Instant recruitmentEndAt) {
        long posterFileId = saveReadyImage(PRODUCER_ID, "performances/poster.jpg");
        producerRepository.saveAndFlush(new Producer(PRODUCER_ID, "테스트 극단", "01012345678"));
        Performance performance = new Performance(
                PRODUCER_ID, posterFileId, "햄릿", "서울특별시 종로구"
        );
        performance.addRole("햄릿", "덴마크의 왕자");
        performanceRepository.saveAndFlush(performance);
        long performanceRoleId = performance.getRoles().getFirst().getId();

        Audition audition = new Audition(
                performance.getId(),
                PRODUCER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        );
        audition.publish(NOW.minusSeconds(86_400));
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
        AuditionForm form = formRepository.saveAndFlush(new AuditionForm(
                audition.getId(),
                new AuditionFormPlan(
                        new ApplicationFields(List.of(), List.of()),
                        new PhotoRequirementPlans(List.of(
                                new PhotoRequirementPlan(null, "정면 사진", 1),
                                new PhotoRequirementPlan(null, "측면 사진", 1)
                        )),
                        new VideoRequirementPlans(List.of()),
                        new AdditionalQuestionPlans(List.of())
                )
        ));
        long fileId = saveReadyImage(APPLICANT_ID, "submissions/profile.jpg");
        List<SubmitPhotoRequirementAnswerCommand> photoAnswers = form.getPhotoRequirements().stream()
                .map(requirement -> new SubmitPhotoRequirementAnswerCommand(requirement.getId(), fileId))
                .toList();
        return new SubmissionFixture(
                audition.getPublicId(),
                fileId,
                createCommand(roleSection.getRoles().getFirst().getId(), photoAnswers)
        );
    }

    private long saveReadyImage(long ownerId, String objectKey) {
        FileAsset file = createImage(ownerId, objectKey);
        file.completeUpload("image/jpeg", 1_024L);
        return fileAssetRepository.saveAndFlush(file).getId();
    }

    private long savePendingImage(long ownerId, String objectKey) {
        return fileAssetRepository.saveAndFlush(createImage(ownerId, objectKey)).getId();
    }

    private FileAsset createImage(long ownerId, String objectKey) {
        FileAsset file = new FileAsset(
                objectKey + "/" + UUID.randomUUID(),
                ownerId,
                new FileMetadata("profile.jpg", "image/jpeg", 1_024L)
        );
        return file;
    }

    private SubmitSubmissionCommand withSelectedRoleIds(
            SubmitSubmissionCommand command,
            List<Long> selectedRoleIds
    ) {
        return new SubmitSubmissionCommand(
                command.basicInformation(),
                command.additionalInformation(),
                selectedRoleIds,
                command.formAnswers(),
                command.consents()
        );
    }

    private SubmitSubmissionCommand withFormAnswers(
            SubmitSubmissionCommand command,
            SubmitFormAnswersCommand formAnswers
    ) {
        return new SubmitSubmissionCommand(
                command.basicInformation(),
                command.additionalInformation(),
                command.selectedRoleIds(),
                formAnswers,
                command.consents()
        );
    }

    private SubmitSubmissionCommand withPhotoFile(SubmitSubmissionCommand command, long fileId) {
        List<SubmitPhotoRequirementAnswerCommand> photoAnswers = command.formAnswers()
                .photoRequirementAnswers()
                .stream()
                .map(answer -> new SubmitPhotoRequirementAnswerCommand(answer.photoRequirementId(), fileId))
                .toList();
        return withFormAnswers(command, new SubmitFormAnswersCommand(
                command.formAnswers().questionAnswers(),
                photoAnswers,
                command.formAnswers().videoRequirementAnswers()
        ));
    }

    private void assertRejectedWithoutPersistence(
            SubmissionFixture fixture,
            SubmitSubmissionCommand command,
            ErrorCode expectedErrorCode
    ) {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> submissionService.submit(APPLICANT_ID, fixture.publicAuditionId(), command)
        );
        assertEquals(expectedErrorCode, exception.getErrorCode());
        assertStoredSubmissionCounts(0, 0, 0);
    }

    private SubmitSubmissionCommand createCommand(
            long roleId,
            List<SubmitPhotoRequirementAnswerCommand> photoAnswers
    ) {
        return new SubmitSubmissionCommand(
                new SubmitBasicInformationCommand(null, null, null, null, null, null, null, null),
                new SubmitAdditionalInformationCommand(
                        null, List.of(), null, null, null, null, null, List.of()
                ),
                List.of(roleId),
                new SubmitFormAnswersCommand(List.of(), photoAnswers, List.of()),
                new SubmitConsentsCommand(true, true)
        );
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

    private StoredSubmission readSubmission(UUID submissionId) {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        return transaction.execute(status -> {
            Submission submission = submissionRepository.findBySubmissionId(submissionId).orElseThrow();
            return new StoredSubmission(
                    submission.getId(),
                    submission.getAuditionId(),
                    submission.getAuditionSnapshot().title(),
                    submission.getSelectedRoles().values().stream()
                            .map(role -> role.roleName())
                            .toList(),
                    submission.getFormAnswers().photoRequirementAnswers().values().stream()
                            .map(PhotoRequirementAnswer::requirementDescription)
                            .toList()
            );
        });
    }

    private void assertStoredSubmissionCounts(long submissions, long consents, long fileReferences) {
        assertEquals(submissions, submissionRepository.count());
        assertEquals(consents, consentRepository.count());
        assertEquals(fileReferences, findSubmissionReferences().size());
    }

    private List<FileReference> findSubmissionReferences() {
        return fileReferenceRepository.findAll().stream()
                .filter(reference -> SubmissionPhotoReferenceWriter.FILE_REFERENCE_TYPE.equals(
                        reference.getReferenceType()
                ))
                .toList();
    }

    private List<FileReference> findSubmissionPosterReferences() {
        return fileReferenceRepository.findAll().stream()
                .filter(reference -> SubmissionPosterReferenceWriter.FILE_REFERENCE_TYPE.equals(
                        reference.getReferenceType()
                ))
                .toList();
    }

    private void cleanDatabase() {
        idempotencyRepository.deleteAll();
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

    private record SubmissionFixture(
            UUID publicAuditionId,
            long fileId,
            SubmitSubmissionCommand command
    ) {
    }

    private record SubmissionAttempt(
            boolean succeeded,
            SubmissionErrorCode errorCode
    ) {

        private static SubmissionAttempt success() {
            return new SubmissionAttempt(true, null);
        }

        private static SubmissionAttempt failure(BusinessException exception) {
            return new SubmissionAttempt(false, (SubmissionErrorCode) exception.getErrorCode());
        }
    }

    private record StoredSubmission(
            long id,
            long auditionId,
            String auditionTitle,
            List<String> roleNames,
            List<String> photoDescriptions
    ) {
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
