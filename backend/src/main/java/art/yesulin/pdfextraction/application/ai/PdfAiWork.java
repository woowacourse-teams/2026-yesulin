package art.yesulin.pdfextraction.application.ai;

import java.util.List;

public record PdfAiWork(String jobId, String leaseToken, long ownerId, String text, List<PdfAiRole> roles,
                        String provider, String modelId, long circuitGeneration, String probeToken,
                        boolean escalated, int retryGeneration) {

}
