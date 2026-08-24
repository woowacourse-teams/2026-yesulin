package art.yesulin.presentation.api.videolibrary;

import art.yesulin.application.videolibrary.AddVideoToLibraryCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddVideoToLibraryRequest(@NotBlank @Size(max = 255) String url) {

    public AddVideoToLibraryCommand toCommand() {
        return new AddVideoToLibraryCommand(url);
    }
}
