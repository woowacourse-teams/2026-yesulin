package art.yesulin.application.otraudition;

import art.yesulin.domain.otraudition.OtrAudition;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PublicOtrAuditionResult(
        UUID id,
        String otrId,
        String title,
        List<String> roles,
        LocalDate deadline,
        String producerName,
        String postingSnapshotVersion,
        boolean open
) {

    public static PublicOtrAuditionResult from(OtrAudition audition, String producerName,
            String postingSnapshotVersion, LocalDate today) {
        return new PublicOtrAuditionResult(audition.getPublicId(), audition.getOtrId(), audition.getTitle(),
                List.copyOf(audition.getRoles()), audition.getDeadline(), producerName, postingSnapshotVersion,
                audition.isOpenOn(today));
    }
}
