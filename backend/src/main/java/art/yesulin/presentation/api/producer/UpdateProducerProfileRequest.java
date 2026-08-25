package art.yesulin.presentation.api.producer;

import art.yesulin.application.producer.UpdateProducerProfileCommand;

/**
 * 전달한 필드만 교체한다. companyName·contactName은 빈 값을 거부하고
 * contactRole·description은 빈 값으로 지울 수 있다.
 */
public record UpdateProducerProfileRequest(
        String companyName,
        String contactName,
        String contactRole,
        String description
) {

    public UpdateProducerProfileCommand toCommand() {
        return new UpdateProducerProfileCommand(companyName, contactName, contactRole, description);
    }
}
