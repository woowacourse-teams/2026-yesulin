package art.yesulin.application.applicant;

import java.util.List;

public record ProfilePrefillResult(
        List<ProfileAnswer> answers,
        int filledCount,
        int requiredCount,
        List<String> missingKeys) {

    public record ProfileAnswer(String key, String label, Object value) {
    }
}
