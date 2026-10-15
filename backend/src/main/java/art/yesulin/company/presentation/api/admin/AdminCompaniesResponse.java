package art.yesulin.company.presentation.api.admin;

import art.yesulin.company.application.AdminCompanyResult;
import java.util.List;

public record AdminCompaniesResponse(List<AdminCompanyResult> companies) {
}
