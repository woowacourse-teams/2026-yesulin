package art.yesulin.application.applicant;

import art.yesulin.application.publication.PublicPostingQueryService;
import art.yesulin.application.publication.PublicPostingResult;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ApplicantProfilePrefillService {

    private final ApplicantProfileService profileService;
    private final PublicPostingQueryService postingQueryService;

    public ApplicantProfilePrefillService(
            ApplicantProfileService profileService,
            PublicPostingQueryService postingQueryService) {
        this.profileService = profileService;
        this.postingQueryService = postingQueryService;
    }

    public ProfilePrefillResult prefill(long accountId, long postingId) {
        ApplicantProfileResult profile = profileService.get(accountId);
        PublicPostingResult posting = postingQueryService.findPosting(postingId);
        Map<String, Object> values = profileValues(profile);
        List<ProfilePrefillResult.ProfileAnswer> answers = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        int requiredCount = 0;
        int filledCount = 0;
        for (PublicPostingResult.PublicField field : posting.applicationFields()) {
            if (field.required()) {
                requiredCount++;
            }
            Object value = field.custom() ? null : values.get(field.key());
            if (hasValue(value)) {
                answers.add(new ProfilePrefillResult.ProfileAnswer(
                        field.key(), field.label(), value));
                if (field.required()) {
                    filledCount++;
                }
            } else if (field.required()) {
                missing.add(field.key());
            }
        }
        return new ProfilePrefillResult(
                List.copyOf(answers), filledCount, requiredCount, List.copyOf(missing));
    }

    private Map<String, Object> profileValues(ApplicantProfileResult profile) {
        Map<String, Object> values = new LinkedHashMap<>(profile.additionalInformation());
        values.put("NAME", profile.name());
        values.put("PHONE", profile.phone());
        values.put("BIRTH", profile.birthDate());
        values.put("GENDER", profile.gender());
        values.put("EMAIL", profile.email());
        values.put("RESIDENCE", profile.residence());
        if (profile.height() != null && profile.weight() != null) {
            values.put("BODY", Map.of("height", profile.height(), "weight", profile.weight()));
        }
        if (!profile.photoUrls().isEmpty()) {
            values.put("PHOTOS", profile.photoUrls());
        }
        return values;
    }

    private boolean hasValue(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof String text) {
            return !text.isBlank();
        }
        return !(value instanceof List<?> list) || !list.isEmpty();
    }
}
