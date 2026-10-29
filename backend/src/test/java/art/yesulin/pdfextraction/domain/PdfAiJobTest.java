package art.yesulin.pdfextraction.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PdfAiJobTest {

    private static final Instant NOW = Instant.parse("2026-10-26T00:00:00Z");

    @Test
    void transientFailuresBackOffAndEventuallyStop() {
        PdfAiJob job = job();
        String token = acquire(job, NOW);
        job.fail(token, "PROVIDER_ERROR", true, 2, NOW.plusSeconds(1));
        assertEquals(PdfAiStatus.PENDING, job.getStatus());
        assertEquals(NOW.plusSeconds(16), job.getNextAttemptAt());
        assertThrows(IllegalStateException.class, () -> acquire(job, NOW.plusSeconds(15)));
        token = acquire(job, NOW.plusSeconds(16));
        job.fail(token, "PROVIDER_ERROR", true, 2, NOW.plusSeconds(17));
        assertEquals(PdfAiStatus.FAILED, job.getStatus());
        assertEquals(2, job.getAttempts());
    }

    @Test
    void expiredWorkerCannotOverwriteTheNewAttempt() {
        PdfAiJob job = job();
        String oldToken = acquire(job, NOW);
        job.recoverExpired(3, NOW.plusSeconds(120));
        assertFalse(job.ownsLease(oldToken, NOW.plusSeconds(120)));
        String newToken = acquire(job, NOW.plusSeconds(135));
        assertThrows(IllegalStateException.class, () -> job.complete(oldToken, "old", NOW.plusSeconds(136)));
        job.complete(newToken, "new", NOW.plusSeconds(136));
        assertEquals("new", job.getResultJson());
        assertEquals(PdfAiStatus.COMPLETED, job.getStatus());
    }

    @Test
    void permanentInvalidOutputIsNotRetriedAndSkipNeverAcquires() {
        PdfAiJob job = job();
        String token = acquire(job, NOW);
        job.fail(token, "INVALID_MODEL_OUTPUT", false, 3, NOW.plusSeconds(1));
        assertEquals(PdfAiStatus.FAILED, job.getStatus());
        assertThrows(IllegalStateException.class, () -> acquire(job, NOW.plusSeconds(100)));
        PdfAiJob skipped = job();
        skipped.skip("LEGACY_COMPLETED", NOW);
        assertThrows(IllegalStateException.class, () -> acquire(skipped, NOW));
        assertTrue(skipped.getAttempts() == 0);
    }

    private PdfAiJob job() {
        return new PdfAiJob("job", "review", 1L, "[]", NOW);
    }

    private String acquire(PdfAiJob job, Instant now) {
        return job.acquire(now, Duration.ofMinutes(2), "bedrock", "test-model", "prompt-v1");
    }
}
