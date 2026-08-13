package art.yesulin.application.company;

public interface ProducerProfileService {

    ProducerProfileResult get(long accountId, long companyId);

    ProducerProfileResult update(
            long accountId,
            long companyId,
            String companyName,
            String contactName,
            String contactRole,
            String description);
}
