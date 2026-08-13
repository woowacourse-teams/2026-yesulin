package art.yesulin.presentation.recruitment;

import art.yesulin.application.recruitment.PerformanceCommand;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PerformanceRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200) String venue,
        @Size(max = 2048) String posterUrl,
        List<@Valid RoleTemplate> roles) {

    public PerformanceRequest {
        roles = roles == null ? List.of() : List.copyOf(roles);
    }

    public record RoleTemplate(
            @NotBlank @Size(max = 100) String name,
            String description,
            @NotBlank @Pattern(regexp = "ANY|MALE|FEMALE") String gender,
            @PositiveOrZero int ageMin,
            @PositiveOrZero int ageMax) {

        art.yesulin.application.recruitment.RoleTemplateCommand toCommand() {
            return new art.yesulin.application.recruitment.RoleTemplateCommand(
                    name, description, gender, ageMin, ageMax);
        }
    }

    PerformanceCommand toCommand() {
        return new PerformanceCommand(
                title, venue, posterUrl, roles.stream().map(RoleTemplate::toCommand).toList());
    }
}
