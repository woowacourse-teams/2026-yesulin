package art.yesulin.domain.audition.role;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditionRoleSectionTest {

    @Test
    void requiresAtLeastTwoRolesWhenMultipleApplicationsAreAllowed() {
        List<AuditionRoleSelection> selections = List.of(selection(1L));

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new AuditionRoleSelections(true, selections)
        );

        assertEquals("AUDITION_INVALID_ROLE_SECTION", exception.getErrorCode().code());
    }

    @Test
    void rejectsAnInvalidAgeRange() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new AuditionRoleCondition(1, RoleGender.ANY, 30, 20)
        );

        assertEquals("AUDITION_INVALID_ROLE_SECTION", exception.getErrorCode().code());
    }

    private AuditionRoleSelection selection(long performanceRoleId) {
        return new AuditionRoleSelection(performanceRoleId, new AuditionRoleCondition(1, RoleGender.ANY, 0, 100));
    }
}
