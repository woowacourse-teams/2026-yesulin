package art.yesulin.domain.audition.query;

public record ReviewCountsResult(int all, int pending, int done, int pass, int fail, int absent, int etc) {
}
