package art.yesulin.presentation.api.otraudition;

import art.yesulin.application.otraudition.OtrAuditionResult;
import java.util.List;

public record OtrAuditionListResponse(List<OtrAuditionResult> auditions) {

    public OtrAuditionListResponse {
        auditions = List.copyOf(auditions);
    }
}
