package art.yesulin.domain.common.validation;

public final class DomainValidator {

    private DomainValidator() {
    }

    public static <T> T requireNonNull(T value, String message) {
        if (value == null) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    public static long requirePositive(long value, String message) {
        if (value < 1) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    public static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }
}
