package art.yesulin.domain.performance;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class PerformanceRolesTest {

    @Test
    void rejectsDuplicatedRoleNameIgnoringCase() {
        Performance performance = new Performance(
                1L, 1L, "햄릿", "서울특별시 종로구 대학로 12"
        );
        performance.addRole("Hamlet", "복수심에 흔들리는 덴마크 왕자");

        BusinessException exception = assertThrows(
                BusinessException.class, () -> performance.addRole("hamlet", "왕위를 되찾으려는 주인공")
        );

        assertEquals(PerformanceErrorCode.DUPLICATE_ROLE_NAME, exception.getErrorCode());
    }

    @Test
    void rejectsMultilineRoleDescriptionAsBusinessRule() {
        Performance performance = new Performance(1L, 1L, "햄릿", "서울특별시 종로구 대학로 12");

        BusinessException exception = assertThrows(
                BusinessException.class, () -> performance.addRole("햄릿", "첫 번째 줄\n두 번째 줄")
        );

        assertEquals(PerformanceErrorCode.INVALID_ROLE_DESCRIPTION, exception.getErrorCode());
    }

    @Test
    void allowsRoleAdditionAfterPerformanceIsPersistedWhenApplicationPolicyPermitsIt() {
        Performance performance = new Performance(1L, 1L, "햄릿", "서울특별시 종로구 대학로 12");
        ReflectionTestUtils.setField(performance, "id", 1L);

        assertDoesNotThrow(() -> performance.addRole("햄릿", "덴마크의 왕자"));
    }
}
