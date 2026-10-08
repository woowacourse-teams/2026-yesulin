package art.yesulin.auditionpost.presentation.api.admin;

import art.yesulin.auditionpost.application.AdminAuditionPostResult;
import java.util.List;

public record AdminAuditionPostsResponse(List<AdminAuditionPostResult> posts) {
}
