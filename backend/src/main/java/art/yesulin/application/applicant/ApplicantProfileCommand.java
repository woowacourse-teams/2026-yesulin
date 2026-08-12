package art.yesulin.application.applicant;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ApplicantProfileCommand(
        String activityName,
        String name,
        Integer height,
        Integer weight,
        LocalDate birthDate,
        String gender,
        String phone,
        String email,
        String residence,
        Map<String, Object> additionalInformation,
        List<String> photoUrls,
        boolean profileSaveConsent) {

    public ApplicantProfileCommand {
        additionalInformation = Map.copyOf(additionalInformation);
        photoUrls = List.copyOf(photoUrls);
    }
}
