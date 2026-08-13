package art.yesulin.application.applicant;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ApplicantProfileResult(
        long applicantId,
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
        Instant consentedAt,
        Instant updatedAt) {

    public static ApplicantProfileResult empty(long applicantId) {
        return new ApplicantProfileResult(
                applicantId, null, null, null, null, null, null, null, null, null,
                Map.of(), List.of(), null, null);
    }

}
