package art.yesulin.presentation.api.admin;

import art.yesulin.domain.admin.query.AdminShowRow;
import java.util.List;

public record AdminShowsResponse(List<AdminShowRow> shows) {
}
