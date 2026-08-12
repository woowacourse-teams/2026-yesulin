package art.yesulin.domain.common;

public final class DomainException extends RuntimeException {

    private final DomainError error;

    public DomainException(DomainError error) {
        super(error.message());
        this.error = error;
    }

    public DomainError error() {
        return error;
    }
}
