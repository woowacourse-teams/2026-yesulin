package art.yesulin.presentation.api.admin;

import art.yesulin.domain.admin.query.AdminProducerRow;
import java.util.List;

public record AdminProducersResponse(List<AdminProducerRow> producers) {
}
