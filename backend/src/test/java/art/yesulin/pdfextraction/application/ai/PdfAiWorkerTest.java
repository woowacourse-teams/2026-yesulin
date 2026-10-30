package art.yesulin.pdfextraction.application.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class PdfAiWorkerTest {

    private final PdfAiQueueService queue = mock(PdfAiQueueService.class);
    private final PdfAiClient client = mock(PdfAiClient.class);
    private final PdfAiPrompt prompt = mock(PdfAiPrompt.class);
    private final PdfAiResponseParser parser = mock(PdfAiResponseParser.class);
    private final PdfAiWorker worker = new PdfAiWorker(queue, client, prompt, parser);

    @Test
    void neverCallsProviderWithoutClaimingCapacity() {
        when(queue.claim()).thenReturn(Optional.empty());
        assertFalse(worker.tick());
        verify(client, never()).generate(anyString(), anyString());
    }

    @Test
    void retryableProviderFailureIsPersistedInsteadOfLostInMemory() {
        PdfAiWork work = new PdfAiWork("job", "lease", 1, "가상 배우", List.of(), "bedrock", "model");
        when(queue.claim()).thenReturn(Optional.of(work));
        when(prompt.systemPrompt()).thenReturn("system");
        when(prompt.userPrompt(work.text(), work.roles())).thenReturn("input");
        PdfAiFailure failure = new PdfAiFailure("PROVIDER_ERROR", true);
        when(client.generate("system", "input")).thenThrow(failure);
        assertTrue(worker.tick());
        verify(queue).fail(work, failure);
        verify(queue, never()).complete(eq(work), any());
    }

    @Test
    void flowShowsCommittedCompletionWithoutSourceOrModelResponse() {
        PdfAiWork work = new PdfAiWork("flow-job", "lease", 1, "SECRET_SOURCE", List.of(), "bedrock", "model");
        when(queue.claim()).thenReturn(Optional.of(work));
        when(client.generate(any(), any())).thenReturn("SECRET_MODEL_RESPONSE");
        when(queue.complete(eq(work), any())).thenReturn(true);
        Logger logger = (Logger) LoggerFactory.getLogger(PdfAiWorker.class);
        final Level originalLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            worker.tick();
            List<String> messages = appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
            assertEquals(3, messages.size());
            assertTrue(messages.get(0).contains("stage=AI_REQUEST_STARTED jobId=flow-job"));
            assertTrue(messages.get(1).contains("stage=AI_RESPONSE_RECEIVED jobId=flow-job"));
            assertTrue(messages.get(2).contains("stage=AI_COMPLETED jobId=flow-job"));
            assertFalse(String.join("\n", messages).contains("SECRET_"));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(originalLevel);
            appender.stop();
        }
    }
}
