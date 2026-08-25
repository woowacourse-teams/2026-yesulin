package art.yesulin.presentation.api.screening;

import art.yesulin.application.screening.ScreeningFilterCondition;
import java.util.List;

public record ScreeningFilterRequest(
        String work,
        String status,
        String keyword,
        List<String> gender,
        String ageOperator,
        Integer age,
        String heightOperator,
        Integer height,
        String weightOperator,
        Integer weight,
        Boolean mismatchOnly
) {

    public ScreeningFilterCondition toCondition() {
        return new ScreeningFilterCondition(
                work, status, keyword, gender,
                numeric(ageOperator, age), numeric(heightOperator, height), numeric(weightOperator, weight),
                Boolean.TRUE.equals(mismatchOnly)
        );
    }

    private ScreeningFilterCondition.NumericCondition numeric(String operator, Integer value) {
        return value == null ? null : new ScreeningFilterCondition.NumericCondition(operator, value);
    }
}
