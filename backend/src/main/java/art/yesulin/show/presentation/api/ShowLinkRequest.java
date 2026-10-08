package art.yesulin.show.presentation.api;

import art.yesulin.show.application.ShowLinkCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 주소 형식(http/https, 도메인)은 도메인 {@code ShowLink}가 검증한다. */
public record ShowLinkRequest(
        @NotBlank @Size(max = 30) String label,
        @NotBlank @Size(max = 500) String url
) {

    ShowLinkCommand toCommand() {
        return new ShowLinkCommand(label, url);
    }
}
