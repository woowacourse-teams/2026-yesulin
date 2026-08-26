package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.role.SaveAuditionRoleCommand;
import art.yesulin.domain.audition.role.RoleGender;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.Locale;

public record SaveAuditionRoleRequest(
        @Positive(message = "공연 배역을 선택해 주세요.") long performanceRoleId,
        @Positive(message = "모집 인원은 1명 이상이어야 합니다.") int recruitmentCount,
        @NotBlank(message = "모집 성별을 선택해 주세요.")
        @Pattern(regexp = "(?i)MALE|FEMALE|ANY", message = "모집 성별은 남성, 여성, 무관 중에서 선택해 주세요.")
        String gender,
        @PositiveOrZero(message = "최소 나이는 0 이상이어야 합니다.") int minimumAge,
        @PositiveOrZero(message = "최대 나이는 0 이상이어야 합니다.") int maximumAge
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
