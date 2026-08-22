package art.yesulin.application.screening;

import java.util.UUID;

public record ScreeningPostingResult(UUID id, String title, boolean openCall) {
}
