package art.yesulin.application.company;

import java.time.Instant;

public record ProducerProfileResult(
        String companyName,
        String contactName,
        String contactRole,
        String logoUrl,
        String description,
        String email,
        String businessNumber,
        String representativeName,
        String verificationStatus,
        Instant verifiedAt) {
}
