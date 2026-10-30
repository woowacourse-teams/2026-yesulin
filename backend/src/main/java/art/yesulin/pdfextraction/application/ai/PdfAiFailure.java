package art.yesulin.pdfextraction.application.ai;

public class PdfAiFailure extends RuntimeException {

    private final String code;
    private final boolean retryable;
    private final String reason;

    public PdfAiFailure(String code, boolean retryable) {
        this(code, retryable, code);
    }

    public PdfAiFailure(String code, boolean retryable, String reason) {
        super(code);
        this.code = code;
        this.retryable = retryable;
        this.reason = reason;
    }

    public String code() {
        return code;
    }

    public boolean retryable() {
        return retryable;
    }

    public String reason() {
        return reason;
    }
}
