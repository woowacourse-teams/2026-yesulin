package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.submission.form.SubmissionFormDefinition;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.SelectedRoles;
import art.yesulin.domain.submission.SubmissionErrorCode;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class SelectedRoleValidatorTest {

    private final SelectedRoleValidator validator = new SelectedRoleValidator();

    @Test
    void createsRoleSnapshotsWithServerNamesInSelectedOrder() {
        SubmissionAudition audition = audition(true);

        SelectedRoles selectedRoles = validator.validateAndCreate(List.of(2L, 1L), audition);

        assertEquals(List.of(2L, 1L), selectedRoles.values().stream()
                .map(role -> role.auditionRoleId())
                .toList());
        assertEquals(List.of("클로디어스", "햄릿"), selectedRoles.values().stream()
                .map(role -> role.roleName())
                .toList());
    }

    @Test
    void rejectsRoleThatIsNoLongerInAudition() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> validator.validateAndCreate(List.of(99L), audition(false))
        );

        assertEquals(SubmissionErrorCode.INVALID_SELECTED_ROLE, exception.getErrorCode());
    }

    @Test
    void rejectsMultipleRolesWhenAuditionAllowsOnlyOne() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> validator.validateAndCreate(List.of(1L, 2L), audition(false))
        );

        assertEquals(SubmissionErrorCode.INVALID_SELECTED_ROLE, exception.getErrorCode());
    }

    @Test
    void rejectsEmptyOrDuplicatedSelection() {
        assertThrows(BusinessException.class, () -> validator.validateAndCreate(List.of(), audition(true)));
        assertThrows(BusinessException.class, () -> validator.validateAndCreate(List.of(1L, 1L), audition(true)));
    }

    private SubmissionAudition audition(boolean allowsMultipleApplications) {
        return new SubmissionAudition(
                1L,
                "햄릿 오디션",
                Instant.parse("2026-09-01T00:00:00Z"),
                Instant.parse("2026-09-10T00:00:00Z"),
                allowsMultipleApplications,
                List.of(new SubmissionAuditionRole(1L, "햄릿"), new SubmissionAuditionRole(2L, "클로디어스")),
                new SubmissionFormDefinition(List.of(), List.of(), List.of(), List.of(), List.of())
        );
    }
}
