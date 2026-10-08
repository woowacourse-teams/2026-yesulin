package art.yesulin.dormant.domain.otraudition;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OtrSubmissionRepository extends JpaRepository<OtrSubmission, Long> {

    boolean existsByOtrAuditionIdAndApplicantId(long otrAuditionId, long applicantId);

    List<OtrSubmission> findAllByOtrAuditionIdAndSelectedRoleOrderBySubmittedAtAscIdAsc(
            long otrAuditionId, String selectedRole
    );

    Optional<OtrSubmission> findByPublicIdAndOtrAuditionIdAndSelectedRole(
            UUID publicId, long otrAuditionId, String selectedRole
    );

    @Query("""
            select (count(submission) > 0)
            from OtrSubmission submission
            join submission.photoFileIds photoFileId
            where photoFileId = :fileId
            """)
    boolean existsSubmittedPhoto(@Param("fileId") long fileId);

    @Query("""
            select (count(submission) > 0)
            from OtrSubmission submission
            join submission.photoFileIds photoFileId, OtrAudition audition
            where photoFileId = :fileId
              and audition.id = submission.otrAuditionId
              and audition.ownerId = :ownerId
            """)
    boolean existsSubmittedPhotoOwnedByProducer(
            @Param("fileId") long fileId,
            @Param("ownerId") long ownerId
    );
}
