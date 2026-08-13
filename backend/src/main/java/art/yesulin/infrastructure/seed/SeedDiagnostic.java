package art.yesulin.infrastructure.seed;

public record SeedDiagnostic(
        String seed,
        String record,
        String field,
        String validation,
        String message) {
}
