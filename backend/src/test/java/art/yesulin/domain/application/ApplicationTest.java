package art.yesulin.domain.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import art.yesulin.domain.applicant.ApplicantId;
import art.yesulin.domain.common.DomainException;
import art.yesulin.domain.recruitment.PostingId;
import art.yesulin.domain.recruitment.RoleId;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApplicationTest {

    private static final PostingId POSTING_ID = new PostingId(10L);
    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-12T03:00:00Z");

    @Test
    @DisplayName("필수 정보와 동의가 있으면 인증된 지원자의 지원서를 제출한다")
    void submitsValidApplication() {
        // given
        Submission submission = validSubmission(List.of(new SelectedRole(new RoleId(1L), POSTING_ID)));

        // when
        Application application = Application.submit(new ApplicationId(100L), new ApplicantId(7L), submission);

        // then
        assertThat(application.roles()).hasSize(1);
        assertThat(application.submittedAt()).isEqualTo(SUBMITTED_AT);
        assertThat(application.snapshot().json()).contains("지원자");
    }

    @Test
    @DisplayName("필수 기본 정보가 누락되면 지원서를 제출할 수 없다")
    void rejectsMissingResidence() {
        // given
        BasicInformation missingResidence = new BasicInformation(
                "지원자", 170, 60, LocalDate.of(2000, 1, 1), Gender.NOT_DISCLOSED,
                "010-0000-0000", "applicant@example.com", "");
        Submission submission = new Submission(POSTING_ID, missingResidence,
                List.of(new SelectedRole(new RoleId(1L), POSTING_ID)), true, requiredConsents(),
                SnapshotDocument.of("{\"name\":\"지원자\"}"), SUBMITTED_AT);

        // when & then
        assertThatThrownBy(() -> Application.submit(
                        new ApplicationId(100L), new ApplicantId(7L), submission))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("공고에 속하지 않은 배역으로 지원할 수 없다")
    void rejectsRoleFromAnotherPosting() {
        // given
        Submission submission = validSubmission(
                List.of(new SelectedRole(new RoleId(1L), new PostingId(99L))));

        // when & then
        assertThatThrownBy(() -> Application.submit(
                        new ApplicationId(100L), new ApplicantId(7L), submission))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("같은 배역을 한 지원서에 중복 저장할 수 없다")
    void rejectsDuplicatedRole() {
        // given
        SelectedRole selectedRole = new SelectedRole(new RoleId(1L), POSTING_ID);
        Submission submission = validSubmission(List.of(selectedRole, selectedRole));

        // when & then
        assertThatThrownBy(() -> Application.submit(
                        new ApplicationId(100L), new ApplicantId(7L), submission))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("복수 배역을 허용하지 않는 공고에는 한 배역만 지원할 수 있다")
    void rejectsMultipleRolesWhenPostingDoesNotAllowThem() {
        Submission submission = new Submission(
                POSTING_ID,
                validBasicInformation(),
                List.of(
                        new SelectedRole(new RoleId(1L), POSTING_ID),
                        new SelectedRole(new RoleId(2L), POSTING_ID)),
                false,
                requiredConsents(),
                SnapshotDocument.of("{\"name\":\"지원자\"}"),
                SUBMITTED_AT);

        assertThatThrownBy(() -> Application.submit(
                        new ApplicationId(100L), new ApplicantId(7L), submission))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("배역을 하나만");
    }

    @Test
    @DisplayName("필수 동의가 없으면 지원서를 제출할 수 없다")
    void rejectsMissingRequiredConsent() {
        // given
        ConsentEvidence collectionOnly = new ConsentEvidence(
                true, false, false, "1.0-draft", "{\"company\":\"공연사\"}");
        Submission submission = new Submission(POSTING_ID, validBasicInformation(),
                List.of(new SelectedRole(new RoleId(1L), POSTING_ID)), true, collectionOnly,
                SnapshotDocument.of("{\"name\":\"지원자\"}"), SUBMITTED_AT);

        // when & then
        assertThatThrownBy(() -> Application.submit(
                        new ApplicationId(100L), new ApplicantId(7L), submission))
                .isInstanceOf(DomainException.class);
    }

    private Submission validSubmission(List<SelectedRole> roles) {
        return new Submission(POSTING_ID, validBasicInformation(), roles, true, requiredConsents(),
                SnapshotDocument.of("{\"name\":\"지원자\"}"), SUBMITTED_AT);
    }

    private BasicInformation validBasicInformation() {
        return new BasicInformation("지원자", 170, 60, LocalDate.of(2000, 1, 1),
                Gender.NOT_DISCLOSED, "010-0000-0000", "applicant@example.com", "서울");
    }

    private ConsentEvidence requiredConsents() {
        return new ConsentEvidence(true, true, false, "1.0-draft", "{\"company\":\"공연사\"}");
    }
}
