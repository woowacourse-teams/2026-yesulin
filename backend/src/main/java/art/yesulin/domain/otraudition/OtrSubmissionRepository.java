package art.yesulin.domain.otraudition;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OtrSubmissionRepository extends JpaRepository<OtrSubmission, Long> {

    boolean existsByOtrAuditionIdAndApplicantId(long otrAuditionId, long applicantId);

    List<OtrSubmission> findAllByOtrAuditionIdAndSelectedRoleOrderBySubmittedAtAscIdAsc(
            long otrAuditionId, String selectedRole
    );

    Optional<OtrSubmission> findByPublicIdAndOtrAuditionIdAndSelectedRole(
            UUID publicId, long otrAuditionId, String selectedRole
    );

    @Query(value = """
            select exists(select 1 from otr_submission_photos photo
                join otr_submissions submission on submission.id = photo.otr_submission_id
                where photo.file_id = :fileId)
            """, nativeQuery = true)
    boolean existsSubmittedPhoto(long fileId);

    @Query(value = """
            select exists(select 1 from otr_submission_photos photo
                join otr_submissions submission on submission.id = photo.otr_submission_id
                join otr_auditions audition on audition.id = submission.otr_audition_id
                where photo.file_id = :fileId and audition.owner_id = :ownerId)
            """, nativeQuery = true)
    boolean existsSubmittedPhotoOwnedByProducer(long fileId, long ownerId);
}
