package art.yesulin.presentation.api.otraudition;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record CreateOtrAuditionRequest(
        @NotBlank @Pattern(regexp = "[0-9]{1,30}") String otrId,
        @NotBlank @Size(max = 200) String title,
        @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 100) String> roles,
        @NotNull LocalDate deadline
) {
}
