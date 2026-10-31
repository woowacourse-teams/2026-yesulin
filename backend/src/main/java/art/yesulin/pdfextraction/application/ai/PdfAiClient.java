package art.yesulin.pdfextraction.application.ai;

public interface PdfAiClient {

    String generate(String systemPrompt, String userPrompt);

    default String generate(PdfAiWork work, String systemPrompt, String userPrompt) {
        return generate(systemPrompt, userPrompt);
    }
}
