package art.yesulin.actor.application.profileimport;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.MAPPER;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.command;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.images;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.manifest;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.domain.photolibrary.PhotoLibraryErrorCode;
import art.yesulin.actor.domain.photolibrary.PhotoVisibility;
import art.yesulin.actor.domain.profileimport.ProfileImportErrorCode;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.global.exception.ErrorCode;
import art.yesulin.pdfextraction.application.FakePdfExtractionStorage;
import art.yesulin.pdfextraction.application.PdfExtractionResultParser;
import art.yesulin.pdfextraction.application.PdfExtractionResultReceiver;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.ai.PdfAiProperties;
import art.yesulin.pdfextraction.application.ai.PdfAiQueueService;
import art.yesulin.pdfextraction.domain.PdfExtractionErrorCode;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionOwnerType;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import art.yesulin.pdfextraction.domain.ai.PdfAiGateRepository;
import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiJobRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import tools.jackson.databind.node.ObjectNode;

class ProfileImportServiceTest {

    /** 한국 시간 2026-10-28 18:00. */
    private static final Instant NOW = Instant.parse("2026-10-28T09:00:00Z");
    private static final long ACTOR = 7L;
    private static final String TEXT = "성명: 김하린\n생년월일: 1998.07.04\n키: 165cm\n연극 햄릿 오필리아 2025";

    private final Map<String, PdfExtractionJob> jobs = new HashMap<>();
    private final Map<String, PdfExtractionPayload> storedPayloads = new HashMap<>();
    private final AtomicReference<Instant> now = new AtomicReference<>(NOW);
    private final FakePdfExtractionStorage storage = new FakePdfExtractionStorage();
    private final PdfAiJobRepository aiJobs =
            mock(PdfAiJobRepository.class);
    private final FileService files = mock(FileService.class);
    private final PhotoLibraryService photos = mock(PhotoLibraryService.class);
    private PdfExtractionService extraction;
    private PdfExtractionResultReceiver receiver;
    private ProfileImportService service;

    @BeforeEach
    void setUp() {
        PdfExtractionJobRepository repository = jobRepository();
        PdfExtractionPayloadRepository payloads = payloadRepository();
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenAnswer(call -> now.get());
        extraction = new PdfExtractionService(repository, payloads, storage, MAPPER, clock,
                mock(PdfAiJobRepository.class), event -> {});
        when(aiJobs.save(any())).thenAnswer(call -> call.getArgument(0));
        PdfAiProperties properties = new PdfAiProperties(false, "gemini", "test-model", "unused", 1, 3,
                Duration.ofMinutes(2), Duration.ofSeconds(10), "none");
        PdfAiQueueService queue = new PdfAiQueueService(aiJobs, mock(PdfAiGateRepository.class), payloads,
                MAPPER, event -> {}, properties, clock);
        receiver = new PdfExtractionResultReceiver(repository, payloads,
                new PdfExtractionResultParser(storage, MAPPER), storage, event -> {}, MAPPER, clock, queue);
        MemberRepository members = mock(MemberRepository.class);
        when(members.findForUpdate(anyLong())).thenReturn(Optional.of(Member.ofApplicant()));
        service = new ProfileImportService(repository, payloads, storage, extraction, files, photos, clock,
                members, aiJobs);
        when(photos.findPhotos(ACTOR)).thenReturn(new PhotoLibraryResult(List.of()));
    }

    @Test
    void actorImportIsKeptApartFromProducerPdfReviews() {
        String jobId = service.prepare(ACTOR, "프로필.pdf", 1_000).jobId();

        PdfExtractionJob job = jobs.get(jobId);
        assertEquals(PdfExtractionPurpose.ACTOR_PROFILE, job.getPurpose());
        assertEquals(PdfExtractionOwnerType.APPLICANT, job.getOwnerType());
        assertNull(job.getReviewId());
        assertEquals(PdfExtractionErrorCode.PDF_EXTRACTION_NOT_FOUND,
                errorOf(() -> extraction.find(ACTOR, jobId, false)));
        assertTrue(extraction.list(ACTOR).isEmpty());
        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_NOT_FOUND, errorOf(() -> service.find(8L, jobId)));
    }

    @Test
    void resultOffersTranscribedValuesWithEvidenceAndOnlyPhotoCandidates() {
        String jobId = uploaded();
        receive(jobId, true);

        ProfileImportResult result = service.find(ACTOR, jobId);

        assertEquals("COMPLETED", result.status());
        assertEquals("COMPLETED", result.analysisStatus());
        ProfileImportResult.Proposals proposals = result.proposals();
        assertEquals(new ProfileImportResult.Fact("김하린", "성명: 김하린"), proposals.name());
        assertEquals("1998.07.04", proposals.birthDate().value());
        assertEquals("165cm", proposals.height().value());
        assertNull(proposals.education());
        assertEquals(List.of("햄릿"),
                proposals.careers().stream().map(ProfileImportResult.Career::title).toList());
        assertEquals(1, proposals.photos().size());
        assertTrue(proposals.photos().getFirst().fileKey().endsWith("p1.png"));
        assertEquals(NOW.plus(Duration.ofHours(24)), result.deletesAt());
    }

    @Test
    void dailyLimitCountsOnlyResultsWithSomethingToSuggest() {
        String failed = uploaded();
        receive(failed, false);
        assertFalse(service.findCurrent(ACTOR).usedToday());

        service.close(ACTOR, failed);
        String used = uploaded();
        receive(used, true);

        assertTrue(service.findCurrent(ACTOR).usedToday());
        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_DAILY_LIMIT, prepareError());
        service.close(ACTOR, used);
        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_DAILY_LIMIT, prepareError());

        now.set(Instant.parse("2026-10-28T15:00:00Z"));
        assertDoesNotThrow(() -> service.prepare(ACTOR, "b.pdf", 10));
    }

    @Test
    void pdfBeingReadBlocksNewUploadsAndClosing() {
        String jobId = service.prepare(ACTOR, "a.pdf", 10).jobId();

        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_IN_PROGRESS, prepareError());
        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_IN_PROGRESS, errorOf(() -> service.close(ACTOR, jobId)));

        now.set(NOW.plus(Duration.ofMinutes(12)));
        assertEquals("UPLOAD_EXPIRED", service.find(ACTOR, jobId).status());
        assertDoesNotThrow(() -> service.prepare(ACTOR, "b.pdf", 10));
    }

    @Test
    void closingDeletesTheStoredDataAndLateResultsAreDiscarded() {
        String jobId = uploaded();
        receive(jobId, true);

        service.close(ACTOR, jobId);
        service.close(ACTOR, jobId);

        assertEquals(List.of(jobId), storage.deletedJobs());
        assertTrue(storedPayloads.isEmpty());
        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_NOT_FOUND, errorOf(() -> service.find(ACTOR, jobId)));
        assertNull(service.findCurrent(ACTOR).current());

        receive(jobId, true);
        assertTrue(storedPayloads.isEmpty());
        assertEquals(List.of(jobId, jobId), storage.deletedJobs());
    }

    @Test
    void resultsAreDeletedOneDayAfterTheyArrive() {
        String finished = uploaded();
        receive(finished, true);
        now.set(NOW.plus(Duration.ofHours(23)));
        final String stuck = uploaded();

        assertEquals(0, service.deleteExpired());
        now.set(NOW.plus(Duration.ofHours(24)).plusSeconds(1));
        assertEquals(1, service.deleteExpired());
        now.set(NOW.plus(Duration.ofHours(47)).plusSeconds(1));
        assertEquals(1, service.deleteExpired());

        assertEquals(List.of(finished, stuck), storage.deletedJobs());
    }

    @Test
    void failedStorageDeletionIsNotRecordedAndIsRetried() {
        String jobId = uploaded();
        receive(jobId, true);
        storage.failNextDeletes(2);

        assertThrows(IllegalStateException.class, () -> service.close(ACTOR, jobId));
        assertFalse(jobs.get(jobId).isDeleted());
        assertFalse(storedPayloads.isEmpty());

        now.set(NOW.plus(Duration.ofHours(24)).plusSeconds(1));
        assertEquals(0, service.deleteExpired());
        assertEquals(1, service.deleteExpired());
        assertTrue(jobs.get(jobId).isDeleted());
        assertTrue(storedPayloads.isEmpty());
    }

    @Test
    void photoCandidateIsCopiedIntoNewActorPhoto() {
        String jobId = uploaded();
        receive(jobId, true);
        String candidate = service.find(ACTOR, jobId).proposals().photos().getFirst().fileKey();
        byte[] image = {1, 2, 3};
        storage.storeImage(candidate, image);
        when(files.createPrivateActorPhoto(ACTOR, "pdf-profile-photo.png", "image/png", image)).thenReturn(55L);
        PhotoLibraryItemResult added = new PhotoLibraryItemResult(
                9L, 55L, "/api/v1/files/55/content", 0, true, NOW, PhotoVisibility.PRIVATE, null
        );
        when(photos.addPhoto(ACTOR, new AddPhotoToLibraryCommand(55L))).thenReturn(added);

        assertEquals(added, service.addPhoto(ACTOR, jobId, candidate));

        String other = candidate.replace("p1.png", "p2.png");
        assertEquals(ProfileImportErrorCode.PROFILE_IMPORT_PHOTO_NOT_FOUND,
                errorOf(() -> service.addPhoto(ACTOR, jobId, other)));
        when(photos.findPhotos(ACTOR)).thenReturn(new PhotoLibraryResult(List.of(added, added, added)));
        assertEquals(PhotoLibraryErrorCode.LIMIT_EXCEEDED,
                errorOf(() -> service.addPhoto(ACTOR, jobId, candidate)));
        verify(files, times(1)).createPrivateActorPhoto(anyLong(), anyString(), anyString(), any());
    }

    @Test
    void closingAnImportAlsoDeletesItsStoredAiProfile() {
        String jobId = uploaded();
        receive(jobId, true);
        PdfAiJob ai = completedAi(jobId);

        service.close(ACTOR, jobId);

        verify(aiJobs).delete(ai);
        assertTrue(jobs.get(jobId).isDeleted());
        assertFalse(storedPayloads.containsKey(jobId));
    }

    @Test
    void retentionCleanupAlsoDeletesItsStoredAiProfile() {
        String jobId = uploaded();
        receive(jobId, true);
        PdfAiJob ai = completedAi(jobId);
        now.set(NOW.plus(Duration.ofHours(24)).plusSeconds(1));

        assertEquals(1, service.deleteExpired());

        verify(aiJobs).delete(ai);
        assertTrue(jobs.get(jobId).isDeleted());
        assertFalse(storedPayloads.containsKey(jobId));
    }

    private PdfAiJob completedAi(String jobId) {
        PdfAiJob ai =
                new PdfAiJob(jobId, null, ACTOR, "[]", NOW);
        String token = ai.acquire(NOW, Duration.ofMinutes(2), "gemini", "test-model", "v1");
        ai.complete(token, "{\"applicantName\":\"가상배우\"}", NOW);
        when(aiJobs.findForUpdate(jobId)).thenReturn(Optional.of(ai));
        when(aiJobs.findById(jobId)).thenReturn(Optional.of(ai));
        return ai;
    }

    private String uploaded() {
        String jobId = service.prepare(ACTOR, "프로필.pdf", 1_000).jobId();
        service.complete(ACTOR, jobId);
        return jobId;
    }

    /** 사진 후보 한 장과 그 밖의 이미지 한 장. 제안이 있으면 이름·생년월일·키·경력을 원문 근거와 함께 담는다. */
    private void receive(String jobId, boolean withProposals) {
        PdfExtractionJob job = jobs.get(jobId);
        ObjectNode manifest = manifest(job, storage, withProposals ? "COMPLETED" : "FAILED", TEXT, "둘째 쪽");
        ((ObjectNode) images(manifest, 0).get(0)).put("classification", withProposals ? "CANDIDATE" : "OTHER");
        ((ObjectNode) images(manifest, 1).get(0)).put("classification", "OTHER");
        if (withProposals) {
            ObjectNode info = manifest.putObject("applicantInfo").put("version", "applicant-info-v2")
                    .put("status", "COMPLETED").put("provider", "gemini").put("model", "model-1")
                    .put("applicantName", "김하린").put("applicantNameEvidence", "성명: 김하린");
            ObjectNode profile = info.putObject("profile");
            profile.putObject("birthDate").put("value", "1998.07.04").put("evidence", "생년월일: 1998.07.04");
            profile.putObject("age").putNull("value").putNull("evidence");
            profile.putObject("height").put("value", "165cm").put("evidence", "키: 165cm");
            profile.putObject("education").putNull("value").putNull("evidence");
            profile.putArray("careers").addObject().put("title", "햄릿").putNull("venue").put("part", "오필리아")
                    .put("genre", "연극").put("period", "2025").putNull("company")
                    .put("evidence", "연극 햄릿 오필리아 2025");
        }
        receiver.receive(command(job, storage, manifest));
    }

    private ErrorCode prepareError() {
        return errorOf(() -> service.prepare(ACTOR, "b.pdf", 10));
    }

    private ErrorCode errorOf(Executable action) {
        return assertThrows(BusinessException.class, action).getErrorCode();
    }

    private PdfExtractionJobRepository jobRepository() {
        PdfExtractionJobRepository repository = mock(PdfExtractionJobRepository.class);
        when(repository.save(any())).thenAnswer(call -> {
            PdfExtractionJob job = call.getArgument(0);
            jobs.put(job.getId(), job);
            return job;
        });
        when(repository.findForUpdate(anyString()))
                .thenAnswer(call -> Optional.ofNullable(jobs.get(call.getArgument(0))));
        when(repository.findByIdAndOwnerIdAndPurpose(anyString(), anyLong(), any())).thenAnswer(call ->
                owned(call.getArgument(0), call.getArgument(1), call.getArgument(2)));
        when(repository.findOwnedForUpdate(anyString(), anyLong(), any())).thenAnswer(call ->
                owned(call.getArgument(0), call.getArgument(1), call.getArgument(2)));
        when(repository.findTop800ByOwnerIdAndPurposeOrderByCreatedAtDesc(anyLong(), any())).thenAnswer(call ->
                jobs.values().stream()
                        .filter(job -> job.getOwnerId() == (long) call.getArgument(0))
                        .filter(job -> job.getPurpose() == call.getArgument(1))
                        .toList());
        when(repository.findAllByOwnerIdAndPurposeAndCreatedAtGreaterThanEqual(anyLong(), any(), any()))
                .thenAnswer(call -> jobs.values().stream()
                        .filter(job -> job.getOwnerId() == (long) call.getArgument(0))
                        .filter(job -> job.getPurpose() == call.getArgument(1))
                        .filter(job -> !job.getCreatedAt().isBefore(call.getArgument(2)))
                        .toList());
        when(repository.findExpiredIds(any(), any(), any())).thenAnswer(call -> {
            Instant before = call.getArgument(1);
            return jobs.values().stream()
                    .filter(job -> job.getPurpose() == call.getArgument(0) && !job.isDeleted())
                    .filter(job -> (job.getFinishedAt() == null ? job.getCreatedAt() : job.getFinishedAt())
                            .isBefore(before))
                    .sorted((left, right) -> left.getCreatedAt().compareTo(right.getCreatedAt()))
                    .map(PdfExtractionJob::getId)
                    .toList();
        });
        return repository;
    }

    private Optional<PdfExtractionJob> owned(String id, long ownerId, PdfExtractionPurpose purpose) {
        return Optional.ofNullable(jobs.get(id))
                .filter(job -> job.getOwnerId() == ownerId && job.getPurpose() == purpose);
    }

    private PdfExtractionPayloadRepository payloadRepository() {
        PdfExtractionPayloadRepository payloads = mock(PdfExtractionPayloadRepository.class);
        when(payloads.findById(anyString()))
                .thenAnswer(call -> Optional.ofNullable(storedPayloads.get(call.getArgument(0))));
        when(payloads.save(any())).thenAnswer(call -> {
            PdfExtractionPayload payload = call.getArgument(0);
            storedPayloads.put(payload.getJobId(), payload);
            return payload;
        });
        doAnswer(call -> storedPayloads.remove(((PdfExtractionPayload) call.getArgument(0)).getJobId()))
                .when(payloads).delete(any());
        return payloads;
    }
}
