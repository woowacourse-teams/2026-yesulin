package art.yesulin.presentation.company;

import jakarta.validation.constraints.Size;

public record ProducerProfileRequest(
        @Size(max = 200) String companyName,
        @Size(max = 100) String contactName,
        @Size(max = 100) String contactRole,
        @Size(max = 200) String description,
        String logoFileId) {
}
