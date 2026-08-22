package art.yesulin.application.screening;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ScreeningSubmissionView(
        UUID id,
        String name,
        String gender,
        LocalDate birthDate,
        Integer height,
        Integer weight,
        String phone,
        String email,
        String school,
        Instant submittedAt,
        List<Career> career,
        String coverLetter,
        String motivation,
        List<Photo> photos,
        List<Video> videos
) {

    public ScreeningSubmissionView {
        career = List.copyOf(career);
        photos = List.copyOf(photos);
        videos = List.copyOf(videos);
    }

    public record Career(int year, String title, String part) {
    }

    public record Photo(String label, String url) {
    }

    public record Video(String label, String url) {
    }
}
