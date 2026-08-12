package art.yesulin.domain.application;

import art.yesulin.domain.recruitment.PostingId;
import art.yesulin.domain.recruitment.RoleId;

public record SelectedRole(RoleId roleId, PostingId postingId) { // no-excuse-ok: domain value object
}
