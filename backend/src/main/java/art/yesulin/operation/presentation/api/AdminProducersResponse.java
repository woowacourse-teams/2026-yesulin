package art.yesulin.operation.presentation.api;

import art.yesulin.operation.domain.query.AdminProducerRow;
import java.util.List;

public record AdminProducersResponse(List<AdminProducerRow> producers) {
}
