package art.yesulin.application.screening;

import art.yesulin.domain.submission.ScreeningSubmissionSearchCondition;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;

public record ScreeningFilterCondition(
        String work,
        String status,
        String keyword,
        List<String> genders,
        NumericCondition age,
        NumericCondition height,
        NumericCondition weight,
        boolean mismatchOnly
) {

    public ScreeningFilterCondition {
        work = normalizeUpper(work);
        status = normalizeUpper(status);
        keyword = keyword == null ? "" : keyword.strip().toLowerCase(Locale.ROOT);
        genders = genders == null ? List.of() : genders.stream().map(ScreeningFilterCondition::normalizeUpper).toList();
    }

    public boolean matches(ScreeningApplicantResult applicant) {
        return matchesWork(applicant)
                && matchesKeyword(applicant)
                && matchesGender(applicant)
                && matchesNumeric(applicant)
                && (!mismatchOnly || !applicant.mismatchReasons().isEmpty());
    }

    public ScreeningSubmissionSearchCondition toSubmissionCondition() {
        return new ScreeningSubmissionSearchCondition(
                keyword, genders, toSubmissionNumeric(age), toSubmissionNumeric(height), toSubmissionNumeric(weight)
        );
    }

    private ScreeningSubmissionSearchCondition.NumericCondition toSubmissionNumeric(NumericCondition condition) {
        return condition == null
                ? null
                : new ScreeningSubmissionSearchCondition.NumericCondition(condition.operator(), condition.value());
    }

    private boolean matchesWork(ScreeningApplicantResult applicant) {
        String reviewStatus = applicant.review().status();
        if ("PENDING".equals(work)) {
            return "PENDING".equals(reviewStatus);
        }
        if ("DONE".equals(work)) {
            return !"PENDING".equals(reviewStatus) && (status.isEmpty() || status.equals(reviewStatus));
        }
        return status.isEmpty() || status.equals(reviewStatus);
    }

    private boolean matchesKeyword(ScreeningApplicantResult applicant) {
        if (keyword.isEmpty()) {
            return true;
        }
        return Stream.of(
                        applicant.name(), applicant.school(), applicant.phone(), applicant.email(), applicant.roleName()
                )
                .filter(Objects::nonNull)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(keyword));
    }

    private boolean matchesGender(ScreeningApplicantResult applicant) {
        return genders.isEmpty() || genders.contains(applicant.gender());
    }

    private boolean matchesNumeric(ScreeningApplicantResult applicant) {
        return NumericCondition.matches(age, applicant.age())
                && NumericCondition.matches(height, applicant.height())
                && NumericCondition.matches(weight, applicant.weight());
    }

    private static String normalizeUpper(String value) {
        return value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
    }

    public record NumericCondition(String operator, int value) {

        public NumericCondition {
            operator = normalizeUpper(operator);
        }

        private static boolean matches(NumericCondition condition, Integer actual) {
            if (condition == null) {
                return true;
            }
            if (actual == null) {
                return false;
            }
            return "LTE".equals(condition.operator) ? actual <= condition.value : actual >= condition.value;
        }
    }
}
