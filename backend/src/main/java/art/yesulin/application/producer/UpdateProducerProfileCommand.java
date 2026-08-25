package art.yesulin.application.producer;

/**
 * 전달하지 않은(null) 필드는 기존 값을 유지한다.
 */
public record UpdateProducerProfileCommand(
        String companyName,
        String contactName,
        String contactRole,
        String description
) {

    public boolean isEmpty() {
        return companyName == null && contactName == null && contactRole == null && description == null;
    }
}
