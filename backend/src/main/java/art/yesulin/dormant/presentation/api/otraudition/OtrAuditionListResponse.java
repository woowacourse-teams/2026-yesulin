package art.yesulin.dormant.presentation.api.otraudition;

import art.yesulin.dormant.application.otraudition.OtrAuditionResult;
import java.util.List;

public record OtrAuditionListResponse(List<OtrAuditionResult> auditions) {

    public OtrAuditionListResponse {
        auditions = List.copyOf(auditions);
    }
}
