package art.yesulin.legacy.presentation.api.otraudition;

import art.yesulin.legacy.application.otraudition.OtrAuditionResult;
import java.util.List;

public record OtrAuditionListResponse(List<OtrAuditionResult> auditions) {

    public OtrAuditionListResponse {
        auditions = List.copyOf(auditions);
    }
}
