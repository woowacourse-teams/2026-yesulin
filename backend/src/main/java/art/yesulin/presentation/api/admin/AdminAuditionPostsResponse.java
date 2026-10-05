package art.yesulin.presentation.api.admin;

import art.yesulin.application.auditionpost.AdminAuditionPostResult;
import java.util.List;

public record AdminAuditionPostsResponse(List<AdminAuditionPostResult> posts) {
}
