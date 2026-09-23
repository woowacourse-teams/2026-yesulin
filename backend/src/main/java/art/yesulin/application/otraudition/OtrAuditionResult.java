package art.yesulin.application.otraudition;

import art.yesulin.domain.otraudition.OtrAudition;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OtrAuditionResult(
        UUID id,
        String otrId,
        String title,
        String otrLink,
        String applicationPath,
        List<String> roles,
        LocalDate deadline,
        Instant createdAt
) {

    public static OtrAuditionResult from(OtrAudition audition) {
        return new OtrAuditionResult(
                audition.getPublicId(),
                audition.getOtrId(),
                audition.getTitle(),
                audition.getOtrLink(),
                "/apply/standard/" + audition.getPublicId(),
                List.copyOf(audition.getRoles()),
                audition.getDeadline(),
                audition.getCreatedAt()
        );
    }
}
