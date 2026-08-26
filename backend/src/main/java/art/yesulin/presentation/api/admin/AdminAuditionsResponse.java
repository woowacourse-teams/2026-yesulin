package art.yesulin.presentation.api.admin;

import art.yesulin.domain.admin.query.AdminAuditionRow;
import java.util.List;

public record AdminAuditionsResponse(List<AdminAuditionRow> auditions) {
}
