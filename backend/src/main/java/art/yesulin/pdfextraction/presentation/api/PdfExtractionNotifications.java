package art.yesulin.pdfextraction.presentation.api;

import art.yesulin.pdfextraction.application.PdfExtractionCompletedEvent;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** 연결된 본인 화면에 변경 신호만 보낸다. 재연결 시 화면이 DB 목록을 다시 읽는다. */
@Component
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfExtractionNotifications {

    private final Map<SseEmitter, Long> connections = new ConcurrentHashMap<>();

    public SseEmitter subscribe(long ownerId) {
        SseEmitter emitter = new SseEmitter(180_000L);
        connections.put(emitter, ownerId);
        emitter.onCompletion(() -> connections.remove(emitter));
        emitter.onError(error -> connections.remove(emitter));
        emitter.onTimeout(() -> {
            connections.remove(emitter);
            emitter.complete();
        });
        send(emitter, "connected", Map.of());
        return emitter;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void completed(PdfExtractionCompletedEvent event) {
        connections.forEach((emitter, ownerId) -> {
            if (ownerId == event.ownerId()) {
                send(emitter, "completed", Map.of("jobId", event.jobId()));
            }
        });
    }

    @Scheduled(fixedDelay = 15_000)
    public void heartbeat() {
        connections.keySet().forEach(emitter -> send(emitter, "heartbeat", Map.of()));
    }

    private void send(SseEmitter emitter, String name, Map<String, String> data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data));
        } catch (IOException | IllegalStateException exception) {
            // 전송 오류의 연결 정리는 컨테이너가 수행하며, 완료 API의 성공은 되돌리지 않는다.
            connections.remove(emitter);
        }
    }

    @PreDestroy
    public void shutdown() {
        connections.keySet().forEach(SseEmitter::complete);
        connections.clear();
    }
}
