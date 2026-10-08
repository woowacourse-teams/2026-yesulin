package art.yesulin.dormant.domain.submission;

public interface SubmissionSelectedRoleProjection {

    long getSubmissionDatabaseId();

    long getRoleId();

    String getRoleName();
}
