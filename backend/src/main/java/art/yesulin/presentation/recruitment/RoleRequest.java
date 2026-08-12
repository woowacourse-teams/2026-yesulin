package art.yesulin.presentation.recruitment;

import art.yesulin.application.recruitment.RoleCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record RoleRequest(
        @NotBlank @Size(max = 100) String name,
        String description,
        @Positive Integer quota,
        @Pattern(regexp = "ANY|MALE|FEMALE|OTHER") String genderCondition,
        @PositiveOrZero Integer ageMin,
        @PositiveOrZero Integer ageMax) {

    RoleCommand toCommand() {
        return new RoleCommand(name, description, quota, genderCondition, ageMin, ageMax);
    }
}
