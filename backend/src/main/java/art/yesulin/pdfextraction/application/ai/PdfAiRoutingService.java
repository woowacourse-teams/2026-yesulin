package art.yesulin.pdfextraction.application.ai;

import art.yesulin.pdfextraction.domain.ai.PdfAiJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiModelCircuit;
import art.yesulin.pdfextraction.domain.ai.PdfAiModelCircuitRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfAiRoutingService {

    private final PdfAiModelCircuitRepository circuits;
    private final PdfAiProperties properties;
    private final PdfAiResilienceProperties resilience;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    // QueueService가 전역 gate를 잠근 뒤 호출한다. 새 모델 행 생성도 이 잠금으로 직렬화한다.
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<PdfAiRoute> reserve(PdfAiJob job, Instant now) {
        String model = job.isEscalationPending() ? resilience.escalationModelId() : properties.modelId();
        if (!protectedProvider()) {
            return Optional.of(new PdfAiRoute(model, -1, null));
        }
        PdfAiModelCircuit circuit = circuits.findForUpdate(model)
                .orElseGet(() -> circuits.saveAndFlush(new PdfAiModelCircuit(model, now)));
        PdfAiModelCircuit.State before = circuit.getState();
        Optional<PdfAiModelCircuit.Permit> permit = circuit.acquire(now, properties.leaseDuration());
        changed(circuit, before);
        if (permit.isPresent()) {
            return Optional.of(new PdfAiRoute(model, permit.get().generation(), permit.get().probeToken()));
        }
        events.publishEvent(new PdfAiCircuitBlockedEvent(model));
        return Optional.empty();
    }

    @Transactional
    public void observe(PdfAiWork work, PdfAiFailure failure) {
        if (work.circuitGeneration() < 0) {
            return;
        }
        circuits.findForUpdate(work.modelId()).ifPresent(circuit -> {
            PdfAiModelCircuit.State before = circuit.getState();
            PdfAiModelCircuit.Permit permit = new PdfAiModelCircuit.Permit(work.circuitGeneration(), work.probeToken());
            if (failure != null && failure.rateLimited()) {
                circuit.rateLimited(permit, clock.instant(), resilience.failureThreshold(),
                        resilience.openDuration(), resilience.maxOpenDuration());
            } else {
                circuit.responded(permit, clock.instant());
            }
            changed(circuit, before);
        });
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void abandon(PdfAiRoute route, Instant now) {
        if (route.circuitGeneration() < 0) {
            return;
        }
        circuits.findForUpdate(route.modelId()).ifPresent(circuit -> {
            PdfAiModelCircuit.State before = circuit.getState();
            circuit.abandon(new PdfAiModelCircuit.Permit(route.circuitGeneration(), route.probeToken()), now);
            changed(circuit, before);
        });
    }

    public boolean canEscalate(PdfAiWork work) {
        return escalationAllowed() && work.modelId().equals(properties.modelId());
    }

    private boolean escalationAllowed() {
        return resilience.escalationEnabled() && properties.provider().equals("bedrock")
                && properties.modelId().contains("openai.gpt-6-luna")
                && !properties.modelId().equals(resilience.escalationModelId());
    }

    private boolean protectedProvider() {
        return resilience.circuitEnabled() && properties.provider().equals("bedrock");
    }

    private void changed(PdfAiModelCircuit circuit, PdfAiModelCircuit.State before) {
        if (circuit.getState() != before) {
            events.publishEvent(new PdfAiCircuitChangedEvent(circuit.getModelId(), circuit.getState().name()));
        }
    }
}
