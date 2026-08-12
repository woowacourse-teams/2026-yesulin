package art.yesulin.domain.company;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.domain.account.AccountId;
import art.yesulin.domain.common.DomainException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CompanyMemberTest {

    @Test
    @DisplayName("같은 회사의 관리자는 회사 소유 작업을 수행할 수 있다")
    void allowsOwnCompanyAccess() {
        // given
        CompanyMember member = CompanyMember.restore(
                new CompanyMemberId(1L), new AccountId(1L), new CompanyId(10L), CompanyRole.ADMIN);

        // when & then
        assertThatCode(() -> member.requireCompanyAccess(new CompanyId(10L)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("다른 회사 데이터에는 접근할 수 없다")
    void rejectsOtherCompanyAccess() {
        // given
        CompanyMember member = CompanyMember.restore(
                new CompanyMemberId(1L), new AccountId(1L), new CompanyId(10L), CompanyRole.ADMIN);

        // when & then
        assertThatThrownBy(() -> member.requireCompanyAccess(new CompanyId(20L)))
                .isInstanceOf(DomainException.class);
    }
}
