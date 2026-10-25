package art.yesulin.pdfreview.application;

import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.INVALID_PDF_REVIEW;
import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_ENTRY_NOT_FOUND;
import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_NOT_FOUND;
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

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionService.PreparedUpload;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionErrorCode;
import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewCount;
import art.yesulin.pdfreview.domain.PdfReviewDecision;
import art.yesulin.pdfreview.domain.PdfReviewEntry;
import art.yesulin.pdfreview.domain.PdfReviewEntryRepository;
import art.yesulin.pdfreview.domain.PdfReviewMatchStatus;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
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

class PdfReviewServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T00:00:00Z");
    private static final long OWNER = 1L;
    private static final long OTHER_OWNER = 2L;

    private final Map<String, PdfReview> reviews = new LinkedHashMap<>();
    private final Map<String, PdfReviewEntry> entries = new LinkedHashMap<>();
    private PdfReviewRepository reviewRepository;
    private PdfReviewEntryRepository entryRepository;
    private PdfExtractionService extraction;
    private PdfReviewService service;
    private PdfReviewExtractionService extractionService;

    @BeforeEach
    void setUp() {
        reviewRepository = mock(PdfReviewRepository.class);
        entryRepository = mock(PdfReviewEntryRepository.class);
        extraction = mock(PdfExtractionService.class);
        stubReviewRepository();
        stubEntryRepository();
        when(extraction.prepare(anyLong(), anyString(), anyString(), anyLong())).thenAnswer(call -> new PreparedUpload(
                UUID.randomUUID().toString(), "key", new PdfExtractionStorage.UploadTarget(
                        "http://localhost/upload", "PUT", NOW.plusSeconds(600), Map.of())));
        service = new PdfReviewService(reviewRepository, entryRepository, extraction,
                Clock.fixed(NOW, ZoneOffset.UTC));
        extractionService = new PdfReviewExtractionService(reviewRepository, entryRepository);
    }

    @Test
    void createsReviewWithOrderedRolesAndListsCounts() {
        PdfReviewDetail created = service.create(OWNER, " 가을 공연 ", List.of("햄릿", "오필리아"));

        assertEquals("가을 공연", created.title());
        assertEquals(List.of("햄릿", "오필리아"), created.roles().stream().map(PdfReviewDetail.RoleView::name).toList());
        assertEquals(List.of(), created.entries());

        service.prepareUpload(OWNER, created.id(), "a.pdf", 10);
        List<PdfReviewSummary> summaries = service.list(OWNER);

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
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        String entryId = uploadEntry(created.id()).id();

        assertNotFound(() -> service.find(OTHER_OWNER, created.id()));
        assertNotFound(() -> service.prepareUpload(OTHER_OWNER, created.id(), "b.pdf", 10));
        assertNotFound(() -> service.editEntry(OTHER_OWNER, created.id(), entryId, "메모", PdfReviewDecision.PASS));
        verify(extraction, never()).prepare(OTHER_OWNER, created.id(), "b.pdf", 10);
        assertEquals(1, entries.size());
        assertEquals(PdfReviewDecision.PENDING, entries.get(entryId).getDecision());
    }

    @Test
    void uploadCreatesWaitingEntryOwnedByTheReview() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));

        PreparedUpload upload = service.prepareUpload(OWNER, created.id(), "지원서.pdf", 10);

        PdfReviewEntryView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(upload.jobId(), entry.jobId());
        assertEquals("지원서.pdf", entry.originalFilename());
        assertEquals(PdfReviewMatchStatus.WAITING, entry.matchStatus());
        assertEquals(PdfReviewDecision.PENDING, entry.decision());
        assertNull(entry.applicantName());
        assertNull(entry.roleId());
        assertEquals("", entry.memo());
    }

    @Test
    void rejectedUploadLeavesNoEntry() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        when(extraction.prepare(anyLong(), anyString(), anyString(), anyLong()))
                .thenThrow(new BusinessException(PdfExtractionErrorCode.INVALID_PDF, "PDF가 아닙니다."));

        assertThrows(BusinessException.class, () -> service.prepareUpload(OWNER, created.id(), "a.txt", 10));

        assertEquals(0, entries.size());
    }

    @Test
    void editChangesOnlyMemoAndDecision() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());
        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");

        PdfReviewEntryView edited = service.editEntry(OWNER, created.id(), uploaded.id(), "다시 보기",
                PdfReviewDecision.HOLD);

        assertEquals("다시 보기", edited.memo());
        assertEquals(PdfReviewDecision.HOLD, edited.decision());
        assertEquals("홍길동", edited.applicantName());
        assertEquals(created.roles().get(0).id(), edited.roleId());
        assertEquals(PdfReviewMatchStatus.MATCHED, edited.matchStatus());
        assertEquals(uploaded.jobId(), edited.jobId());
        assertEquals("a.pdf", edited.originalFilename());
    }

    @Test
    void editRejectsUnknownEntryOrEntryOfAnotherReview() {
        PdfReviewDetail first = service.create(OWNER, "첫째", List.of("햄릿"));
        PdfReviewDetail second = service.create(OWNER, "둘째", List.of("햄릿"));
        String entryId = uploadEntry(first.id()).id();

        BusinessException unknown = assertThrows(BusinessException.class, () -> service.editEntry(
                OWNER, first.id(), UUID.randomUUID().toString(), "", PdfReviewDecision.PASS));
        BusinessException crossed = assertThrows(BusinessException.class, () -> service.editEntry(
                OWNER, second.id(), entryId, "", PdfReviewDecision.PASS));

        assertEquals(PDF_REVIEW_ENTRY_NOT_FOUND, unknown.getErrorCode());
        assertEquals(PDF_REVIEW_ENTRY_NOT_FOUND, crossed.getErrorCode());
        assertEquals(PdfReviewDecision.PENDING, entries.get(entryId).getDecision());
    }

    @Test
    void extractionResultIsAppliedToTheLinkedEntryAndNeverTouchesMemoOrDecision() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿", "오필리아"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());
        service.editEntry(OWNER, created.id(), uploaded.id(), "메모", PdfReviewDecision.PASS);

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "이름: 김영희\n지원 배역: 오필리아");

        PdfReviewEntryView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(PdfReviewMatchStatus.MATCHED, entry.matchStatus());
        assertEquals(created.roles().get(1).id(), entry.roleId());
        assertEquals("김영희", entry.applicantName());
        assertEquals("메모", entry.memo());
        assertEquals(PdfReviewDecision.PASS, entry.decision());
    }

    @Test
    void applicantInfoReplacesLabelMatchingAndNeverTouchesMemoOrDecision() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿", "오필리아"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());
        service.editEntry(OWNER, created.id(), uploaded.id(), "메모", PdfReviewDecision.PASS);
        String ophelia = created.roles().get(1).id();

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿\n오필리아 지원",
                applicantInfo("COMPLETED", "", "홍길동", "성명: 홍길동", ophelia, "오필리아 지원"));

        PdfReviewEntryView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(PdfReviewMatchStatus.MATCHED, entry.matchStatus());
        assertEquals(ophelia, entry.roleId());
        assertEquals("홍길동", entry.applicantName());
        assertEquals("메모", entry.memo());
        assertEquals(PdfReviewDecision.PASS, entry.decision());
    }

    @Test
    void applicantInfoWithUnknownRoleOrFailureNeedsCheckWithoutFallingBackToLabels() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());
        String text = "성명: 홍길동\n지원배역: 햄릿";

        extractionService.applyExtraction(uploaded.jobId(), OWNER, text,
                applicantInfo("COMPLETED", "", "홍길동", "성명: 홍길동", UUID.randomUUID().toString(), "지원배역: 햄릿"));
        PdfReviewEntryView unknownRole = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, unknownRole.matchStatus());
        assertNull(unknownRole.roleId());
        assertEquals("홍길동", unknownRole.applicantName());
        extractionService.applyExtraction(uploaded.jobId(), OWNER, text,
                applicantInfo("FAILED", "PROVIDER_ERROR", null, null, null, null));
        PdfReviewEntryView failed = service.find(OWNER, created.id()).entries().get(0);

        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, failed.matchStatus());
        assertNull(failed.roleId());
        assertNull(failed.applicantName());
    }

    @Test
    void repeatedResultKeepsTheSameStateAndEditedFields() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());
        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");
        PdfReviewEntryView first = service.find(OWNER, created.id()).entries().get(0);
        service.editEntry(OWNER, created.id(), uploaded.id(), "메모", PdfReviewDecision.FAIL);

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "성명: 홍길동\n지원배역: 햄릿");

        PdfReviewEntryView second = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(first.roleId(), second.roleId());
        assertEquals(first.matchEvidence(), second.matchEvidence());
        assertEquals("메모", second.memo());
        assertEquals(PdfReviewDecision.FAIL, second.decision());
        assertEquals(1, entries.size());
    }

    @Test
    void emptyOrFailedExtractionKeepsTheEntryForChecking() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());

        extractionService.applyExtraction(uploaded.jobId(), OWNER, "");

        PdfReviewEntryView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(PdfReviewMatchStatus.NEEDS_CHECK, entry.matchStatus());
        assertNull(entry.roleId());
        assertNull(entry.applicantName());
        assertEquals(PdfReviewDecision.PENDING, entry.decision());
    }

    @Test
    void resultOfAnUnlinkedJobOrAnotherOwnerIsIgnored() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());

        extractionService.applyExtraction(UUID.randomUUID().toString(), OWNER, "지원배역: 햄릿");
        extractionService.applyExtraction(uploaded.jobId(), OTHER_OWNER, "지원배역: 햄릿");

        PdfReviewEntryView entry = service.find(OWNER, created.id()).entries().get(0);
        assertEquals(PdfReviewMatchStatus.WAITING, entry.matchStatus());
        assertNull(entry.roleId());
    }

    @Test
    void failureWhileApplyingPropagatesSoTheCallbackCanRetry() {
        PdfReviewDetail created = service.create(OWNER, "제목", List.of("햄릿"));
        PdfReviewEntryView uploaded = uploadEntry(created.id());
        when(reviewRepository.findByIdAndOwnerId(anyString(), anyLong())).thenThrow(new IllegalStateException("db"));

        assertThrows(IllegalStateException.class,
                () -> extractionService.applyExtraction(uploaded.jobId(), OWNER, "지원배역: 햄릿"));
    }

    private PdfApplicantInfo applicantInfo(String status, String reason, String name, String nameEvidence,
                                           String roleId, String roleEvidence) {
        return new PdfApplicantInfo("applicant-info-v1", status, "bedrock", "model-1", name, nameEvidence, roleId,
                roleEvidence, reason);
    }

    private PdfReviewEntryView uploadEntry(String reviewId) {
        service.prepareUpload(OWNER, reviewId, "a.pdf", 10);
        return service.find(OWNER, reviewId).entries().stream().reduce((first, second) -> second).orElseThrow();
    }

    private void assertNotFound(Runnable action) {
        BusinessException exception = assertThrows(BusinessException.class, action::run);
        assertEquals(PDF_REVIEW_NOT_FOUND, exception.getErrorCode());
    }

    private void stubReviewRepository() {
        when(reviewRepository.save(any())).thenAnswer(call -> {
            PdfReview review = call.getArgument(0);
            reviews.put(review.getId(), review);
            return review;
        });
        when(reviewRepository.findByIdAndOwnerId(anyString(), anyLong())).thenAnswer(call ->
                Optional.ofNullable(reviews.get(call.getArgument(0)))
                        .filter(review -> review.isOwnedBy((long) call.getArgument(1))));
        when(reviewRepository.findByOwnerIdOrderByCreatedAtDesc(anyLong())).thenAnswer(call ->
                reviews.values().stream().filter(review -> review.isOwnedBy((long) call.getArgument(0))).toList());
        when(reviewRepository.countRolesByReviewIds(any())).thenAnswer(call ->
                reviews.values().stream()
                        .map(review -> new PdfReviewCount(review.getId(), review.getRoles().size()))
                        .toList());
    }

    private void stubEntryRepository() {
        when(entryRepository.save(any())).thenAnswer(call -> {
            PdfReviewEntry entry = call.getArgument(0);
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
                        .map(id -> new PdfReviewCount(id, entries.values().stream()
                                .filter(entry -> entry.getReviewId().equals(id)).count()))
                        .toList());
    }
}
