package art.yesulin.domain.submission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long>, SubmissionRepositoryCustom {

    Optional<Submission> findBySubmissionId(UUID submissionId);

    Optional<Submission> findBySubmissionIdAndApplicantId(UUID submissionId, long applicantId);

    @Query("""
            select distinct submission
            from Submission submission
            join submission.selectedRoles.values role
            where submission.auditionSnapshot.auditionId = :auditionId
              and role.auditionRoleId = :roleId
            order by submission.submittedAt asc, submission.id asc
            """)
    List<Submission> findAllForScreening(
            @Param("auditionId") long auditionId,
            @Param("roleId") long roleId
    );

    @Query("""
            select submission.id as id,
                   submission.submissionId as submissionId,
                   submission.auditionSnapshot.publicAuditionId as auditionPublicId,
                   submission.auditionSnapshot.title as auditionTitle,
                   submission.auditionSnapshot.performanceTitle as performanceTitle,
                   submission.auditionSnapshot.companyName as companyName,
                   submission.auditionSnapshot.posterFileId as posterFileId,
                   submission.auditionSnapshot.posterOwnerId as posterOwnerId,
                   submission.submittedAt as submittedAt
            from Submission submission
            where submission.applicantId = :applicantId
            order by submission.submittedAt desc, submission.id desc
            """)
    List<SubmissionSummaryProjection> findSummariesByApplicantId(@Param("applicantId") long applicantId);

    @Query("""
            select submission.id as submissionDatabaseId,
                   role.auditionRoleId as roleId,
                   role.roleName as roleName
            from Submission submission
            join submission.selectedRoles.values role
            where submission.id in :submissionIds
            order by submission.submittedAt desc, submission.id desc, index(role)
            """)
    List<SubmissionSelectedRoleProjection> findSelectedRolesBySubmissionIds(
            @Param("submissionIds") List<Long> submissionIds
    );

    @Query("""
            select (count(submission) > 0)
            from Submission submission
            where submission.applicantId = :applicantId
              and submission.auditionSnapshot.auditionId = :auditionId
            """)
    boolean existsByApplicantIdAndAuditionId(
            @Param("applicantId") long applicantId,
            @Param("auditionId") long auditionId
    );

    @Query("""
            select (count(submission) > 0)
            from Submission submission, Audition audition, FileReference reference
            where reference.fileId = :fileId
              and reference.referenceType = 'SUBMISSION_PHOTO'
              and reference.referenceId = submission.id
              and submission.auditionSnapshot.auditionId = audition.id
              and audition.ownerId = :producerId
            """)
    boolean existsSubmittedPhotoOwnedByProducer(
            @Param("fileId") long fileId,
            @Param("producerId") long producerId
    );

    @Query("""
            select (count(submission) > 0)
            from Submission submission
            where submission.auditionSnapshot.auditionId = :auditionId
            """)
    boolean existsByAuditionId(@Param("auditionId") long auditionId);
}
