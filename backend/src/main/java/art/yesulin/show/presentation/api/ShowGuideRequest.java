package art.yesulin.show.presentation.api;

import art.yesulin.show.application.ShowGuideCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShowGuideRequest(
        @NotBlank @Size(max = 30) String title,
        @NotBlank @Size(max = 1000) String content
) {

    ShowGuideCommand toCommand() {
        return new ShowGuideCommand(title, content);
    }
}
