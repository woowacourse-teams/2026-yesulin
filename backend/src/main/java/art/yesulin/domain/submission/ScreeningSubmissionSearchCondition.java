package art.yesulin.domain.submission;

import java.util.List;

public record ScreeningSubmissionSearchCondition(
        String keyword,
        List<String> genders,
        NumericCondition age,
        NumericCondition height,
        NumericCondition weight
) {

    public ScreeningSubmissionSearchCondition {
        keyword = keyword == null ? "" : keyword;
        genders = genders == null ? List.of() : List.copyOf(genders);
    }

    public boolean isEmpty() {
        return keyword.isEmpty() && genders.isEmpty() && age == null && height == null && weight == null;
    }

    public record NumericCondition(String operator, int value) {
    }
}
