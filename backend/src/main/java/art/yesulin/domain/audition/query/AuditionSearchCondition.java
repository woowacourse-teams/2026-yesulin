package art.yesulin.domain.audition.query;

import java.util.Locale;

public record AuditionSearchCondition(String keyword, String phase) {

    public AuditionSearchCondition {
        keyword = keyword == null ? "" : keyword.strip();
        phase = phase == null ? "" : phase.strip().toUpperCase(Locale.ROOT);
    }

    public boolean matches(AuditionManagementResult audition) {
        return matchesKeyword(audition) && matchesPhase(audition);
    }

    private boolean matchesKeyword(AuditionManagementResult audition) {
        return keyword.isEmpty()
                || audition.title().toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT));
    }

    private boolean matchesPhase(AuditionManagementResult audition) {
        return phase.isEmpty() || audition.phase().equals(phase);
    }
}
