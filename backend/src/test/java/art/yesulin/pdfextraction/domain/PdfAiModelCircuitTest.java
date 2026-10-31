package art.yesulin.pdfextraction.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.pdfextraction.domain.ai.PdfAiModelCircuit;
import art.yesulin.pdfextraction.domain.ai.PdfAiModelCircuit.Permit;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PdfAiModelCircuitTest {

    private static final Instant NOW = Instant.parse("2026-10-31T00:00:00Z");
    private static final Duration LEASE = Duration.ofMinutes(2);
    private final PdfAiModelCircuit circuit = new PdfAiModelCircuit("model", NOW);

    @Test
    void opensAfterThreeFailuresAndIgnoresLateSuccessFromOldGeneration() {
        Permit old = circuit.acquire(NOW, LEASE).orElseThrow();
        for (int i = 0; i < 3; i++) {
            reject(old, NOW.plusSeconds(i));
        }
        circuit.responded(old, NOW.plusSeconds(3));
        assertEquals(PdfAiModelCircuit.State.OPEN, circuit.getState());
        assertTrue(circuit.acquire(NOW.plusSeconds(61), LEASE).isEmpty());
        Permit probe = circuit.acquire(NOW.plusSeconds(62), LEASE).orElseThrow();
        assertTrue(circuit.acquire(NOW.plusSeconds(62), LEASE).isEmpty());
        circuit.responded(probe, NOW.plusSeconds(63));
        assertEquals(PdfAiModelCircuit.State.CLOSED, circuit.getState());
        assertEquals(0, circuit.getConsecutiveFailures());
    }

    @Test
    void failedProbesBackOffToFiveMinutesAndExpiredProbeCanBeReplaced() {
        Permit initial = circuit.acquire(NOW, LEASE).orElseThrow();
        for (int i = 0; i < 3; i++) {
            reject(initial, NOW);
        }
        Instant next = NOW.plusSeconds(60);
        for (long delay : new long[]{120, 240, 300, 300}) {
            Permit probe = circuit.acquire(next, LEASE).orElseThrow();
            reject(probe, next);
            assertEquals(next.plusSeconds(delay), circuit.getNextProbeAt());
            next = next.plusSeconds(delay);
        }
        Permit abandoned = circuit.acquire(next, LEASE).orElseThrow();
        assertTrue(circuit.acquire(next.plusSeconds(119), LEASE).isEmpty());
        Permit replacement = circuit.acquire(next.plus(LEASE), LEASE).orElseThrow();
        circuit.responded(abandoned, next.plus(LEASE));
        assertEquals(PdfAiModelCircuit.State.HALF_OPEN, circuit.getState());
        circuit.responded(replacement, next.plus(LEASE));
        assertEquals(PdfAiModelCircuit.State.CLOSED, circuit.getState());
    }

    private void reject(Permit permit, Instant now) {
        circuit.rateLimited(permit, now, 3, Duration.ofSeconds(60), Duration.ofMinutes(5));
    }
}
