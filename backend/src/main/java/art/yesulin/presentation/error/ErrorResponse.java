package art.yesulin.presentation.error;

public record ErrorResponse(String code, String message, Object detail) {
}
