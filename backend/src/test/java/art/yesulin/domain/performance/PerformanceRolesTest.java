package art.yesulin.domain.performance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

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
}
