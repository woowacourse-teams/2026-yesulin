package art.yesulin.domain.audition.query;

import java.util.List;

public record AuditionPhaseCountsResult(
        int all,
        int draft,
        int upcoming,
        int open,
        int recruitClosed,
        int finished
) {

    public static AuditionPhaseCountsResult from(List<AuditionManagementResult> auditions) {
        return new AuditionPhaseCountsResult(
                auditions.size(), count(auditions, "DRAFT"), count(auditions, "UPCOMING"),
                count(auditions, "OPEN"), count(auditions, "RECRUIT_CLOSED"), count(auditions, "FINISHED")
        );
    }

    private static int count(List<AuditionManagementResult> auditions, String phase) {
        return (int) auditions.stream().filter(audition -> audition.phase().equals(phase)).count();
    }
}
