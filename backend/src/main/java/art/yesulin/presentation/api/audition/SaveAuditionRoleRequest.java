package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.role.SaveAuditionRoleCommand;
import art.yesulin.domain.audition.role.RoleGender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.Locale;

public record SaveAuditionRoleRequest(
        @Positive long performanceRoleId,
        @Positive int recruitmentCount,
        @NotBlank @Pattern(regexp = "(?i)MALE|FEMALE|ANY") String gender,
        @PositiveOrZero int minimumAge,
        @PositiveOrZero int maximumAge
) {

    public SaveAuditionRoleCommand toCommand() {
        return new SaveAuditionRoleCommand(
                performanceRoleId,
                recruitmentCount,
                RoleGender.valueOf(gender.toUpperCase(Locale.ROOT)),
                minimumAge,
                maximumAge
        );
    }
}
