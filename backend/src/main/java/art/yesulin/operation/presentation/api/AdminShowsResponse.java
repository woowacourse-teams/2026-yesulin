package art.yesulin.operation.presentation.api;

import art.yesulin.operation.domain.query.AdminShowRow;
import java.util.List;

public record AdminShowsResponse(List<AdminShowRow> shows) {
}
