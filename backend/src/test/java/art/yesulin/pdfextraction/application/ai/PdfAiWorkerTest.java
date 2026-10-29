package art.yesulin.pdfextraction.application.ai;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PdfAiWorkerTest {

    private final PdfAiQueueService queue = mock(PdfAiQueueService.class);
    private final PdfAiClient client = mock(PdfAiClient.class);
    private final PdfAiPrompt prompt = mock(PdfAiPrompt.class);
    private final PdfAiResponseParser parser = mock(PdfAiResponseParser.class);
    private final PdfAiWorker worker = new PdfAiWorker(queue, client, prompt, parser);

    @Test
    void neverCallsProviderWithoutClaimingCapacity() {
        when(queue.claim()).thenReturn(Optional.empty());
        worker.tick();
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
        worker.tick();
        verify(queue).fail(work, failure);
        verify(queue, never()).complete(eq(work), any());
    }
}
