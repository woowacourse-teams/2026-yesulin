package art.yesulin.presentation.api.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeleteAdminFileRequest(
        @NotBlank
        @Size(max = 128)
        String confirmationPassword
) {

    @Override
    public String toString() {
        return "DeleteAdminFileRequest[confirmationPassword=[REDACTED]]";
    }
}
