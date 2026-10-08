package art.yesulin.dormant.presentation.api.photolibrary;

import art.yesulin.dormant.application.photolibrary.AddPhotoToLibraryCommand;
import jakarta.validation.constraints.Positive;

public record AddPhotoToLibraryRequest(@Positive long fileId) {

    public AddPhotoToLibraryCommand toCommand() {
        return new AddPhotoToLibraryCommand(fileId);
    }
}
