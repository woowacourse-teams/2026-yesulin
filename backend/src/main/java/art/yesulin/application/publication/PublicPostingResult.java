package art.yesulin.application.publication;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record PublicPostingResult(
        long id,
        PublicPerformance performance,
        PublicCompany company,
        String title,
        String status,
        boolean allowsMultipleRoles,
        Instant recruitmentStartsAt,
        Instant recruitmentEndsAt,
        String applicationGuide,
        List<PublicRole> roles,
        List<PublicField> applicationFields) {

    public record PublicPerformance(long id, String title, String venue, String posterUrl) {
    }

    public record PublicCompany(long id, String name) {
    }

    public record PublicRole(
            long id,
            String name,
            String description,
            Integer quota,
            String genderCondition,
            Integer ageMin,
            Integer ageMax) {
    }

    public record PublicField(
            long id,
            String key,
            String label,
            boolean required,
            boolean custom,
            String section,
            String inputType,
            int order,
            Map<String, Object> config) {
    }
}
