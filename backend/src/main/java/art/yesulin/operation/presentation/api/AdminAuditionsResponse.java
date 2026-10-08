package art.yesulin.operation.presentation.api;

import art.yesulin.operation.domain.query.AdminAuditionRow;
import java.util.List;

public record AdminAuditionsResponse(List<AdminAuditionRow> auditions) {
}
