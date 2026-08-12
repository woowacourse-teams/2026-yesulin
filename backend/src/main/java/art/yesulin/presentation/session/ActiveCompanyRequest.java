package art.yesulin.presentation.session;

import jakarta.validation.constraints.Positive;

public record ActiveCompanyRequest(@Positive long companyId) {
}
