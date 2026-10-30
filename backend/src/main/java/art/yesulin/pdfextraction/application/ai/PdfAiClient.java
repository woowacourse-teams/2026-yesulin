package art.yesulin.pdfextraction.application.ai;

public interface PdfAiClient {

    String generate(String systemPrompt, String userPrompt);
}
