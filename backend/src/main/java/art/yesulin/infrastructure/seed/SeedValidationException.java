package art.yesulin.infrastructure.seed;

public class SeedValidationException extends RuntimeException {

    private final java.util.List<SeedDiagnostic> diagnostics;

    public SeedValidationException(String message) {
        super(message);
        this.diagnostics = java.util.List.of(new SeedDiagnostic(
                "seed-file", "unknown", "unknown", "VALIDATION", message));
    }

    public SeedValidationException(String message, Throwable cause) {
        super(message, cause);
        this.diagnostics = java.util.List.of(new SeedDiagnostic(
                "seed-file", "unknown", "unknown", "PARSE", message));
    }

    public SeedValidationException(SeedDiagnostic diagnostic) {
        super(diagnostic.message());
        this.diagnostics = java.util.List.of(diagnostic);
    }

    public java.util.List<SeedDiagnostic> diagnostics() {
        return diagnostics;
    }
}
