package art.yesulin.company.presentation.api.admin;

import art.yesulin.company.domain.CompanyStatus;
import jakarta.validation.constraints.NotNull;

public record ChangeCompanyStatusRequest(@NotNull CompanyStatus status) {
}
