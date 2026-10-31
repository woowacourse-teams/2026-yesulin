package art.yesulin.pdfextraction.domain.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_ai_model_circuits")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfAiModelCircuit {

    @Id
    @Column(length = 150)
    private String modelId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private State state;
    @Column(nullable = false)
    private int consecutiveFailures;
    @Column(nullable = false)
    private int openCount;
    @Column(nullable = false)
    private long generation;
    private Instant nextProbeAt;
    @Column(length = 36)
    private String probeToken;
    private Instant probeExpiresAt;
    @Column(nullable = false)
    private Instant updatedAt;

    public PdfAiModelCircuit(String modelId, Instant now) {
        this.modelId = Objects.requireNonNull(modelId);
        this.state = State.CLOSED;
        this.updatedAt = now;
    }

    public Optional<Permit> acquire(Instant now, Duration lease) {
        if (state == State.CLOSED) {
            return Optional.of(new Permit(generation, null));
        }
        Instant availableAt = state == State.OPEN ? nextProbeAt : probeExpiresAt;
        if (now.isBefore(availableAt)) {
            return Optional.empty();
        }
        state = State.HALF_OPEN;
        generation++;
        probeToken = UUID.randomUUID().toString();
        probeExpiresAt = now.plus(lease);
        updatedAt = now;
        return Optional.of(new Permit(generation, probeToken));
    }

    public void rateLimited(Permit permit, Instant now, int threshold, Duration initial, Duration maximum) {
        if (!owns(permit)) {
            return;
        }
        consecutiveFailures++;
        if (state == State.HALF_OPEN || consecutiveFailures >= threshold) {
            openCount = Math.min(11, openCount + 1);
            Duration delay = initial.multipliedBy(1L << (openCount - 1));
            state = State.OPEN;
            nextProbeAt = now.plus(delay.compareTo(maximum) > 0 ? maximum : delay);
            generation++;
            clearProbe();
        }
        updatedAt = now;
    }

    public void responded(Permit permit, Instant now) {
        if (!owns(permit)) {
            return;
        }
        consecutiveFailures = 0;
        if (state == State.HALF_OPEN) {
            state = State.CLOSED;
            openCount = 0;
            nextProbeAt = null;
            generation++;
            clearProbe();
        }
        updatedAt = now;
    }

    public void abandon(Permit permit, Instant now) {
        if (state == State.HALF_OPEN && owns(permit)) {
            state = State.OPEN;
            nextProbeAt = now;
            generation++;
            clearProbe();
            updatedAt = now;
        }
    }

    private boolean owns(Permit permit) {
        return permit.generation() == generation && (state == State.CLOSED && permit.probeToken() == null
                || state == State.HALF_OPEN && Objects.equals(probeToken, permit.probeToken()));
    }

    private void clearProbe() {
        probeToken = null;
        probeExpiresAt = null;
    }

    public enum State {
        CLOSED, OPEN, HALF_OPEN
    }

    public record Permit(long generation, String probeToken) {
    }
}
