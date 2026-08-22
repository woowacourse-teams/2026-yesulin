package art.yesulin.application.screening;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ScreeningApplicantResult(
        UUID id,
        String name,
        String gender,
        int age,
        Integer height,
        Integer weight,
        long roleId,
        String roleName,
        LocalDate birth,
        String phone,
        String email,
        String school,
        Instant submittedAt,
        List<Career> career,
        String coverLetter,
        String motivation,
        List<Photo> photos,
        List<Video> videos,
        Review review,
        Map<Integer, Review> reviewHistory,
        List<String> mismatchReasons
) {

    public ScreeningApplicantResult {
        career = List.copyOf(career);
        photos = List.copyOf(photos);
        videos = List.copyOf(videos);
        reviewHistory = Collections.unmodifiableMap(new LinkedHashMap<>(reviewHistory));
        mismatchReasons = List.copyOf(mismatchReasons);
    }

    public record Career(int year, String title, String part) {
    }

    public record Photo(String label, String url) {
    }

    public record Video(String label, String url) {
    }

    public record Review(String status, String memo, String note) {
    }
}
