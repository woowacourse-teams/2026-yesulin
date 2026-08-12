package art.yesulin.infrastructure.seed;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SeedData(
        Producer producer,
        List<Performance> performances,
        List<Posting> postings,
        List<Role> roles,
        List<PostingField> postingFields) {

    public record Producer(
            String companyName,
            String contactName,
            String email,
            String businessNumber,
            String representativeName,
            LocalDateTime verifiedAtUtc) {
    }

    public record Performance(
            String sourceId, String title, String venue, String posterUrl, String producerName) {
    }

    public record Posting(
            String sourceId,
            String performanceSourceId,
            String title,
            String status,
            LocalDate recruitmentStart,
            LocalDate recruitmentEnd,
            String applicationGuide) {
    }

    public record Role(
            String sourceId,
            String postingSourceId,
            String performanceSourceId,
            String name,
            String description,
            Integer quota,
            String gender,
            Integer ageMin,
            Integer ageMax) {
    }

    public record PostingField(
            String postingSourceId,
            String sourceId,
            String key,
            String label,
            boolean required,
            boolean custom,
            String section,
            String inputType,
            int order,
            String configJson) {
    }
}
