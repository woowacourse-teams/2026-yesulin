package art.yesulin.pdfextraction.application.ai;

public class PdfAiFailure extends RuntimeException {

    private final String code;
    private final boolean retryable;

    public PdfAiFailure(String code, boolean retryable) {
        super(code);
        this.code = code;
        this.retryable = retryable;
    }

    public String code() {
        return code;
    }

    public boolean retryable() {
        return retryable;
    }
}
