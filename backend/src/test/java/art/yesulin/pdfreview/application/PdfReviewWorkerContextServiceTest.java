package art.yesulin.pdfreview.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.NOW;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.FakePdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfreview.domain.PdfReview;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PdfReviewWorkerContextServiceTest {

    private final PdfExtractionJobRepository jobs = mock(PdfExtractionJobRepository.class);
    private final PdfReviewRepository reviews = mock(PdfReviewRepository.class);
    private final FakePdfExtractionStorage storage = new FakePdfExtractionStorage();
    private PdfReviewWorkerContextService service;

    @BeforeEach
    void setUp() {
        service = new PdfReviewWorkerContextService(jobs, reviews, storage);
    }

    @Test
    void linkedJobReturnsRegisteredRolesInOrderWithoutSigningTheSource() {
        PdfReview review = new PdfReview(7L, "제목", List.of("햄릿", "오필리아"), NOW);
        PdfExtractionJob job = job(7L, review.getId());
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(reviews.findByIdAndOwnerId(review.getId(), 7L)).thenReturn(Optional.of(review));

        PdfReviewWorkerContext context = service.find(job.getId());

        assertEquals("PDF_REVIEW", context.purpose());
        assertEquals(review.getId(), context.reviewId());
        assertEquals(storage.sourceFileKey(job), context.sourceFileKey());
        assertEquals(List.of("햄릿", "오필리아"), context.roles().stream().map(PdfReviewWorkerContext.Role::name).toList());
        assertEquals(review.getRoles().get(0).getId(), context.roles().get(0).id());
        assertEquals(0, storage.signedUrls());
        assertEquals(0, storage.verifications());
        assertFalse(context.resultStored());
        job.receiveResult("COMPLETED", NOW);
        assertTrue(service.find(job.getId()).resultStored());
    }

    @Test
    void unlinkedJobHasNoReviewAndNoRoles() {
        PdfExtractionJob job = job(7L, null);
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));

        PdfReviewWorkerContext context = service.find(job.getId());

        assertNull(context.reviewId());
        assertEquals(List.of(), context.roles());
    }

    @Test
    void actorProfileImportTellsTheWorkerToSkipRoles() {
        PdfExtractionJob job = PdfExtractionJob.forActorProfile(7L, "프로필.pdf", 100, NOW, NOW.plusSeconds(600));
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));

        PdfReviewWorkerContext context = service.find(job.getId());

        assertEquals("ACTOR_PROFILE", context.purpose());
        assertNull(context.reviewId());
        assertEquals(List.of(), context.roles());
    }

    @Test
    void missingJobIsNotFound() {
        BusinessException exception = assertThrows(BusinessException.class, () -> service.find("missing"));

        assertEquals("PDF_EXTRACTION_NOT_FOUND", exception.getErrorCode().code());
    }

    @Test
    void reviewOwnedBySomeoneElseIsNotFound() {
        PdfReview review = new PdfReview(8L, "제목", List.of("햄릿"), NOW);
        PdfExtractionJob job = job(7L, review.getId());
        when(jobs.findById(job.getId())).thenReturn(Optional.of(job));
        when(reviews.findByIdAndOwnerId(review.getId(), 8L)).thenReturn(Optional.of(review));

        BusinessException exception = assertThrows(BusinessException.class, () -> service.find(job.getId()));

        assertEquals("PDF_REVIEW_NOT_FOUND", exception.getErrorCode().code());
    }

    private PdfExtractionJob job(long ownerId, String reviewId) {
        return new PdfExtractionJob(ownerId, "a.pdf", 100, NOW, NOW.plusSeconds(600), reviewId);
    }
}
