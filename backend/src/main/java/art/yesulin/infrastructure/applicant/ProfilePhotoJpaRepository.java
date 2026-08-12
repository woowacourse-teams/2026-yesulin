package art.yesulin.infrastructure.applicant;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfilePhotoJpaRepository extends JpaRepository<ProfilePhotoJpaEntity, Long> {

    List<ProfilePhotoJpaEntity> findAllByApplicantProfileIdOrderByPhotoOrder(Long profileId);

    void deleteAllByApplicantProfileId(Long profileId);
}
