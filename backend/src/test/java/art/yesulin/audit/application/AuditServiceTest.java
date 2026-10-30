package art.yesulin.audit.application;

import static art.yesulin.audit.domain.AuditErrorCode.INVALID_PDF_REVIEW;
import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_ENTRY_NOT_FOUND;
import static art.yesulin.audit.domain.AuditErrorCode.PDF_REVIEW_NOT_FOUND;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditCount;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.audit.domain.AuditMatchStatus;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AuditServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T00:00:00Z");
    private static final String SHA = "a".repeat(64);
    private static final long OWNER = 1L;
    private static final long OTHER_OWNER = 2L;

    private final Map<String, Audit> reviews = new LinkedHashMap<>();
    private final Map<String, AuditApplicant> entries = new LinkedHashMap<>();
    private AuditRepository reviewRepository;
    private AuditApplicantRepository entryRepository;
    private PdfExtractionService extraction;
    private AuditService service;
    private AuditExtractionService extractionService;

    @BeforeEach
    void setUp() {
        reviewRepository = mock(AuditRepository.class);
        entryRepository = mock(AuditApplicantRepository.class);
        extraction = mock(PdfExtractionService.class);
        stubReviewRepository();
        stubEntryRepository();
        when(extraction.prepareReview(anyLong(), anyString(), anyString(), anyLong(), anyString()))
                .thenAnswer(call -> new PreparedUpload(UUID.randomUUID().toString(), "key",
                        new PdfExtractionStorage.UploadTarget("http://localhost/upload", "PUT",
                                NOW.plusSeconds(600), Map.of())));
        service = new AuditService(reviewRepository, entryRepository, extraction,
                Clock.fixed(NOW, ZoneOffset.UTC));
        art.yesulin.pdfextraction.application.ai.PdfAiQueueService aiQueue =
                mock(art.yesulin.pdfextraction.application.ai.PdfAiQueueService.class);
        when(aiQueue.enqueue(anyString(), anyString(), anyLong(), any(), any(), any())).thenAnswer(call -> {
            art.yesulin.pdfextraction.domain.ai.PdfAiJob job = new art.yesulin.pdfextraction.domain.ai.PdfAiJob(
                    call.getArgument(0), call.getArgument(1), call.getArgument(2), "[]", NOW);
            job.skip("DISABLED", NOW);
            return job;
        });
        extractionService = new AuditExtractionService(reviewRepository, entryRepository, aiQueue);
    }

    @Test
    void createsReviewWithOrderedRolesAndListsCounts() {
        AuditDetail created = service.create(OWNER, " 가을 공연 ", List.of("햄릿", "오필리아"));

        assertEquals("가을 공연", created.title());
        assertEquals(List.of("햄릿", "오필리아"), created.roles().stream().map(AuditDetail.RoleView::name).toList());
        assertEquals(List.of(), created.entries());

        service.prepareUpload(OWNER, created.id(), "a.pdf", 10, SHA);
        List<AuditSummary> summaries = service.list(OWNER);

        assertEquals(1, summaries.size());
        assertEquals(2, summaries.get(0).roleCount());
        assertEquals(1, summaries.get(0).entryCount());
        assertEquals(List.of(), service.list(OTHER_OWNER));
    }

    @Test
    void rejectsDuplicateRolesWithoutStoringAnything() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.create(OWNER, "제목", List.of("햄릿", " 햄릿")));

        assertEquals(INVALID_PDF_REVIEW, exception.getErrorCode());
        assertEquals(0, reviews.size());
    }

    @Test
    void anotherOwnerCannotReadUploadToOrEditReview() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        String entryId = uploadEntry(created.id()).id();

        assertNotFound(() -> service.find(OTHER_OWNER, created.id()));
        assertNotFound(() -> service.prepareUpload(OTHER_OWNER, created.id(), "b.pdf", 10, SHA));
        assertNotFound(() -> service.editEntry(OTHER_OWNER, created.id(), entryId, "메모", AuditDecision.PASS));
        verify(extraction, never()).prepareReview(OTHER_OWNER, created.id(), "b.pdf", 10, SHA);
        assertEquals(1, entries.size());
        assertEquals(AuditDecision.PENDING, entries.get(entryId).getDecision());
    }

    @Test
    void uploadCreatesWaitingEntryOwnedByTheReview() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));

        PreparedUpload upload = service.prepareUpload(OWNER, created.id(), "지원서.pdf", 10, SHA);

        AuditApplicantView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(upload.jobId(), entry.jobId());
        assertEquals("지원서.pdf", entry.originalFilename());
        assertEquals(AuditMatchStatus.WAITING, entry.matchStatus());
        assertEquals(AuditDecision.PENDING, entry.decision());
        assertNull(entry.applicantName());
        assertNull(entry.roleId());
        assertEquals("", entry.memo());
    }

    @Test
    void rejectedUploadLeavesNoEntry() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        when(extraction.prepareReview(anyLong(), anyString(), anyString(), anyLong(), anyString()))
                .thenThrow(new BusinessException(PdfExtractionErrorCode.INVALID_PDF, "PDF가 아닙니다."));

        assertThrows(BusinessException.class, () -> service.prepareUpload(OWNER, created.id(), "a.txt", 10, SHA));

        assertEquals(0, entries.size());
    }

    @Test
    void fullReviewRejectsNewSourcesButStillAcceptsExistingSource() {
        AuditDetail review = service.create(OWNER, "제목", List.of());
        when(entryRepository.countByReviewId(review.id())).thenReturn(800L);
        assertThrows(BusinessException.class,
                () -> service.prepareUpload(OWNER, review.id(), "new.pdf", 10, SHA));
        when(extraction.prepareReview(OWNER, review.id(), "existing.pdf", 10, SHA))
                .thenReturn(new PreparedUpload("existing", "key", null, true));

        PreparedUpload reused = service.prepareUpload(OWNER, review.id(), "existing.pdf", 10, SHA);

        assertEquals("existing", reused.jobId());
        assertEquals(0, entries.size());
    }

    @Test
    void editChangesOnlyMemoAndDecision() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(created.id());
        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");

        AuditApplicantView edited = service.editEntry(OWNER, created.id(), uploaded.id(), "다시 보기",
                AuditDecision.HOLD);

        assertEquals("다시 보기", edited.memo());
        assertEquals(AuditDecision.HOLD, edited.decision());
        assertEquals("홍길동", edited.applicantName());
        assertEquals(created.roles().get(0).id(), edited.roleId());
        assertEquals(AuditMatchStatus.MATCHED, edited.matchStatus());
        assertEquals(uploaded.jobId(), edited.jobId());
        assertEquals("a.pdf", edited.originalFilename());
    }

    @Test
    void editRejectsUnknownEntryOrEntryOfAnotherReview() {
        AuditDetail first = service.create(OWNER, "첫째", List.of("햄릿"));
        AuditDetail second = service.create(OWNER, "둘째", List.of("햄릿"));
        String entryId = uploadEntry(first.id()).id();

        BusinessException unknown = assertThrows(BusinessException.class, () -> service.editEntry(
                OWNER, first.id(), UUID.randomUUID().toString(), "", AuditDecision.PASS));
        BusinessException crossed = assertThrows(BusinessException.class, () -> service.editEntry(
                OWNER, second.id(), entryId, "", AuditDecision.PASS));

        assertEquals(PDF_REVIEW_ENTRY_NOT_FOUND, unknown.getErrorCode());
        assertEquals(PDF_REVIEW_ENTRY_NOT_FOUND, crossed.getErrorCode());
        assertEquals(AuditDecision.PENDING, entries.get(entryId).getDecision());
    }

    @Test
    void extractionResultIsAppliedToTheLinkedEntryAndNeverTouchesMemoOrDecision() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿", "오필리아"));
        AuditApplicantView uploaded = uploadEntry(created.id());
        service.editEntry(OWNER, created.id(), uploaded.id(), "메모", AuditDecision.PASS);

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "이름: 김영희\n지원 배역: 오필리아");

        AuditApplicantView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(AuditMatchStatus.MATCHED, entry.matchStatus());
        assertEquals(created.roles().get(1).id(), entry.roleId());
        assertEquals("김영희", entry.applicantName());
        assertEquals("메모", entry.memo());
        assertEquals(AuditDecision.PASS, entry.decision());
    }

    @Test
    void applicantInfoReplacesLabelMatchingAndNeverTouchesMemoOrDecision() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿", "오필리아"));
        AuditApplicantView uploaded = uploadEntry(created.id());
        service.editEntry(OWNER, created.id(), uploaded.id(), "메모", AuditDecision.PASS);
        String ophelia = created.roles().get(1).id();

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿\n오필리아 지원",
                applicantInfo("COMPLETED", "", "홍길동", "성명: 홍길동", ophelia, "오필리아 지원"));

        AuditApplicantView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(AuditMatchStatus.MATCHED, entry.matchStatus());
        assertEquals(ophelia, entry.roleId());
        assertEquals("홍길동", entry.applicantName());
        assertEquals("메모", entry.memo());
        assertEquals(AuditDecision.PASS, entry.decision());
    }

    @Test
    void applicantInfoWithUnknownRoleOrFailureNeedsCheckWithoutFallingBackToLabels() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(created.id());
        String text = "성명: 홍길동\n지원배역: 햄릿";

        extractionService.applyExtraction(uploaded.jobId(), OWNER, text,
                applicantInfo("COMPLETED", "", "홍길동", "성명: 홍길동", UUID.randomUUID().toString(), "지원배역: 햄릿"));
        AuditApplicantView unknownRole = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(AuditMatchStatus.NEEDS_CHECK, unknownRole.matchStatus());
        assertNull(unknownRole.roleId());
        assertEquals("홍길동", unknownRole.applicantName());
        extractionService.applyExtraction(uploaded.jobId(), OWNER, text,
                applicantInfo("FAILED", "PROVIDER_ERROR", null, null, null, null));
        AuditApplicantView failed = service.find(OWNER, created.id()).entries().get(0);

        assertEquals(AuditMatchStatus.NEEDS_CHECK, failed.matchStatus());
        assertNull(failed.roleId());
        assertNull(failed.applicantName());
    }

    @Test
    void repeatedResultKeepsTheSameStateAndEditedFields() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(created.id());
        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");
        AuditApplicantView first = service.find(OWNER, created.id()).entries().get(0);
        service.editEntry(OWNER, created.id(), uploaded.id(), "메모", AuditDecision.FAIL);

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");

        AuditApplicantView second = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(first.roleId(), second.roleId());
        assertEquals(first.matchEvidence(), second.matchEvidence());
        assertEquals("메모", second.memo());
        assertEquals(AuditDecision.FAIL, second.decision());
        assertEquals(1, entries.size());
    }

    @Test
    void emptyOrFailedExtractionKeepsTheEntryForChecking() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(created.id());

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "");

        AuditApplicantView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(AuditMatchStatus.NEEDS_CHECK, entry.matchStatus());
        assertNull(entry.roleId());
        assertNull(entry.applicantName());
        assertEquals(AuditDecision.PENDING, entry.decision());
    }

    @Test
    void resultOfAnUnlinkedJobOrAnotherOwnerIsIgnored() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(created.id());

        extractionService.applyExtraction(UUID.randomUUID().toString(), OWNER, "지원배역: 햄릿");
        extractionService.applyExtraction(uploaded.jobId(), OTHER_OWNER, "지원배역: 햄릿");

        AuditApplicantView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(AuditMatchStatus.WAITING, entry.matchStatus());
        assertNull(entry.roleId());
    }

    @Test
    void failureWhileApplyingPropagatesSoTheCallbackCanRetry() {
        AuditDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(created.id());
        when(reviewRepository.findByIdAndOwnerId(anyString(), anyLong())).thenThrow(new IllegalStateException("db"));

        assertThrows(IllegalStateException.class,
                () -> extractionService.applyExtraction(uploaded.jobId(), OWNER, "지원배역: 햄릿"));
    }

    @Test
    void manualRoleSurvivesLateExtractionAndPreservesHistoricalDecisionAndMemo() {
        AuditDetail review = service.create(OWNER, "제목", List.of("햄릿", "오필리아"));
        AuditApplicantView uploaded = uploadEntry(review.id());
        String role = review.roles().get(1).id();
        service.editEntry(OWNER, review.id(), uploaded.id(), "기존 메모", AuditDecision.HOLD);
        service.assignRoles(OWNER, review.id(), List.of(uploaded.id()), role);
        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");
        AuditApplicantView entry = service.find(OWNER, review.id()).entries().get(0);
        assertEquals(role, entry.roleId());
        assertEquals("홍길동", entry.applicantName());
        assertEquals("기존 메모", entry.memo());
        assertEquals(AuditDecision.HOLD, entry.decision());
        art.yesulin.pdfextraction.application.PdfApplicantInfo aiInfo =
                new art.yesulin.pdfextraction.application.PdfApplicantInfo("applicant-info-v2", "COMPLETED",
                        "bedrock", "model", "홍길동", "홍길동", review.roles().get(0).id(), "지원배역: 햄릿", "");
        extractionService.applyAi(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿", aiInfo);
        AuditApplicantView afterAi = service.find(OWNER, review.id()).entries().get(0);
        assertEquals(role, afterAi.roleId());
        assertEquals("기존 메모", afterAi.memo());
        assertEquals(AuditDecision.HOLD, afterAi.decision());
    }

    @Test
    void rejectsOtherOwnersAndForeignRolesAndEntriesForAssignment() {
        AuditDetail review = service.create(OWNER, "제목", List.of("햄릿"));
        AuditDetail other = service.create(OTHER_OWNER, "다른 심사", List.of("햄릿"));
        AuditApplicantView uploaded = uploadEntry(review.id());
        service.prepareUpload(OTHER_OWNER, other.id(), "foreign.pdf", 10, SHA);
        AuditApplicantView foreign = service.find(OTHER_OWNER, other.id()).entries().get(0);
        assertNotFound(() -> service.assignRoles(OTHER_OWNER, review.id(), List.of(uploaded.id()), null));
        assertThrows(BusinessException.class, () -> service.assignRoles(OWNER, review.id(),
                List.of(uploaded.id()), other.roles().get(0).id()));
        assertThrows(BusinessException.class, () -> service.assignRoles(OWNER, review.id(),
                List.of(foreign.id()), null));
        assertThrows(BusinessException.class, () -> service.assignRoles(OWNER, review.id(),
                List.of(uploaded.id(), uploaded.id()), null));
    }

    private PdfApplicantInfo applicantInfo(String status, String reason, String name, String nameEvidence,
                                           String roleId, String roleEvidence) {
        return new PdfApplicantInfo("applicant-info-v1", status, "bedrock", "model-1", name, nameEvidence, roleId,
                roleEvidence, reason);
    }

    private AuditApplicantView uploadEntry(String reviewId) {
        service.prepareUpload(OWNER, reviewId, "a.pdf", 10, SHA);
        return service.find(OWNER, reviewId).entries().stream().reduce((first, second) -> second).orElseThrow();
    }

    private void assertNotFound(Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(PDF_REVIEW_NOT_FOUND, exception.getErrorCode());
    }

    private void stubReviewRepository() {
        when(reviewRepository.save(any())).thenAnswer(call -> {
            Audit review = call.getArgument(0);
            reviews.put(review.getId(), review);
            return review;
        });
        when(reviewRepository.findByIdAndOwnerId(anyString(), anyLong())).thenAnswer(call ->
                Optional.ofNullable(reviews.get(call.getArgument(0)))
                        .filter(review -> review.isOwnedBy((long) call.getArgument(1))));
        when(reviewRepository.findOwnedForUpdate(anyString(), anyLong())).thenAnswer(call ->
                Optional.ofNullable(reviews.get(call.getArgument(0)))
                        .filter(review -> review.isOwnedBy((long) call.getArgument(1))));
        when(reviewRepository.findByOwnerIdOrderByCreatedAtDesc(anyLong())).thenAnswer(call ->
                reviews.values().stream().filter(review -> review.isOwnedBy((long) call.getArgument(0))).toList());
        when(reviewRepository.countRolesByReviewIds(any())).thenAnswer(call ->
                reviews.values().stream()
                        .map(review -> new AuditCount(review.getId(), review.getRoles().size()))
                        .toList());
    }

    private void stubEntryRepository() {
        when(entryRepository.save(any())).thenAnswer(call -> {
            AuditApplicant entry = call.getArgument(0);
            entries.put(entry.getId(), entry);
            return entry;
        });
        when(entryRepository.findByReviewIdOrderByOriginalFilenameAscIdAsc(anyString())).thenAnswer(call ->
                entries.values().stream().filter(entry -> entry.getReviewId().equals(call.getArgument(0))).toList());
        when(entryRepository.findInReviewForUpdate(anyString(), anyString())).thenAnswer(call ->
                Optional.ofNullable(entries.get(call.getArgument(0)))
                        .filter(entry -> entry.getReviewId().equals(call.getArgument(1))));
        when(entryRepository.findByJobIdForUpdate(anyString())).thenAnswer(call ->
                entries.values().stream().filter(entry -> entry.getJobId().equals(call.getArgument(0))).findFirst());
        when(entryRepository.countByReviewIds(any())).thenAnswer(call ->
                reviews.keySet().stream()
                        .map(id -> new AuditCount(id, entries.values().stream()
                                .filter(entry -> entry.getReviewId().equals(id)).count()))
                        .toList());
    }
}
