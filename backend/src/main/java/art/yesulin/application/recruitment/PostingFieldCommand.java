package art.yesulin.application.recruitment;

public record PostingFieldCommand(
        String key,
        String label,
        boolean required,
        boolean custom,
        String section,
        String inputType,
        int order,
        String configJson) {
}
