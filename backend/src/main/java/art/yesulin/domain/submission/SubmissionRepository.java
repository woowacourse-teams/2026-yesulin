package art.yesulin.domain.submission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    Optional<Submission> findBySubmissionId(UUID submissionId);

    List<Submission> findAllByApplicantIdOrderBySubmittedAtDesc(long applicantId);

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
}
