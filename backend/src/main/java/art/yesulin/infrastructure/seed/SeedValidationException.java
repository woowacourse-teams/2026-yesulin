package art.yesulin.infrastructure.seed;

public class SeedValidationException extends RuntimeException {

    public SeedValidationException(String message) {
        super(message);
    }

    public SeedValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
