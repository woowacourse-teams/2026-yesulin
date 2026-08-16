package art.yesulin.presentation.api;

import java.util.Map;

public record ErrorResponse(String code, String message, Map<String, String> detail) {
}
