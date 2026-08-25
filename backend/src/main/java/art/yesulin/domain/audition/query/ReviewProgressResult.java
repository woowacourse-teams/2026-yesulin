package art.yesulin.domain.audition.query;

public record ReviewProgressResult(int done, int total, int percent) {

    public static ReviewProgressResult of(int done, int total) {
        int percent = total == 0 ? 0 : Math.round(done * 100F / total);
        return new ReviewProgressResult(done, total, percent);
    }
}
