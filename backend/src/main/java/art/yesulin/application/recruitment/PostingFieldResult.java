package art.yesulin.application.recruitment;

public record PostingFieldResult(
        long id,
        String key,
        String label,
        boolean required,
        boolean custom,
        String section,
        String inputType,
        int order,
        String configJson) {
}
