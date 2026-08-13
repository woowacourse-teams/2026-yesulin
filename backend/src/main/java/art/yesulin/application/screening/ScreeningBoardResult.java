package art.yesulin.application.screening;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ScreeningBoardResult(
        PerformanceRef performance,
        PostingRef posting,
        RoleSummary role,
        int round,
        List<RoundState> rounds,
        List<Applicant> applicants) {

    public record PerformanceRef(long id, String posterUrl, String title) {
    }

    public record PostingRef(long id, String title, boolean allowsMultipleRoles) {
    }

    public record Counts(
            int all, int pending, int done, int pass, int fail, int absent, int etc) {
    }

    public record Progress(int done, int total, int percent) {
    }

    public record RoleSummary(
            long id,
            long postingId,
            String name,
            String description,
            int quota,
            String gender,
            int ageMin,
            int ageMax,
            int applicantCount,
            int activeRound,
            boolean allRoundsClosed,
            Progress progress,
            Counts counts) {
    }

    public record RoundState(
            int round,
            String name,
            boolean open,
            boolean closed,
            Counts counts,
            Progress progress) {
    }

    public record Review(String status, String memo, String note) {
    }

    public record Photo(String label, String url, String fallbackUrl) {
    }

    public record Career(int year, String title, String part) {
    }

    public record Applicant(
            long id,
            String name,
            String gender,
            int age,
            int height,
            int weight,
            long roleId,
            String roleName,
            String birth,
            String phone,
            String email,
            String school,
            Instant submittedAt,
            List<Career> career,
            String coverLetter,
            String motivation,
            List<Photo> photos,
            String videoUrl,
            Review review,
            Map<Integer, Review> reviewHistory,
            List<String> mismatchReasons) {
    }
}
