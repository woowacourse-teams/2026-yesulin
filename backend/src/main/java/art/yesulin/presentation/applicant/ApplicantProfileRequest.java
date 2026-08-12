package art.yesulin.presentation.applicant;

import art.yesulin.application.applicant.ApplicantProfileCommand;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ApplicantProfileRequest(
        @Size(max = 100) String activityName,
        @Size(max = 100) String name,
        @Min(1) @Max(300) Integer height,
        @Min(1) @Max(500) Integer weight,
        LocalDate birthDate,
        String gender,
        @Size(max = 30) String phone,
        @Email @Size(max = 320) String email,
        @Size(max = 200) String residence,
        Map<String, Object> additionalInformation,
        @Size(max = 10) List<String> photoUrls,
        boolean profileSaveConsent) {

    public ApplicantProfileCommand toCommand() {
        return new ApplicantProfileCommand(
                activityName, name, height, weight, birthDate, gender, phone, email, residence,
                additionalInformation == null ? Map.of() : additionalInformation,
                photoUrls == null ? List.of() : photoUrls,
                profileSaveConsent);
    }
}
