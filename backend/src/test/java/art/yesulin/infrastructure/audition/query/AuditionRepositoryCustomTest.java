package art.yesulin.infrastructure.audition.query;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.query.AuditionManagementResult;
import art.yesulin.domain.audition.query.AuditionRoleManagementResult;
import art.yesulin.domain.audition.query.PerformanceManagementResult;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSelection;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import art.yesulin.domain.audition.schedule.ScreeningStagePlans;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.AuditionSnapshot;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import art.yesulin.domain.submission.QuestionAnswers;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.SelectedRoles;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.profiles.active=test",
        "spring.datasource.url=jdbc:h2:mem:audition-management-query;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class AuditionRepositoryCustomTest {

    private static final long OWNER_ID = 1L;
    private static final Instant CURRENT_TIME = Instant.parse("2026-08-25T06:00:00Z");

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void aggregatesOwnedPerformanceAuditionRoleSubmissionAndReview() {
        Performance performance = savePerformance(OWNER_ID, "햄릿");
        Audition audition = saveOpenAudition(performance);
        AuditionRoleSection roleSection = saveRoleSection(audition, performance);
        AuditionSchedule schedule = saveSchedule(audition);
        long roleId = roleSection.getRoles().getFirst().getId();
        long stageId = schedule.getStages().getFirst().getId();
        Submission reviewed = saveSubmission(audition, roleId, 10L);
        saveSubmission(audition, roleId, 11L);
        saveReview(reviewed, roleId, stageId);
        savePerformance(2L, "다른 소유자의 공연");
        entityManager.flush();
        entityManager.clear();

        List<PerformanceManagementResult> results = auditionRepository.findPerformances(OWNER_ID, CURRENT_TIME);

        assertThat(results).hasSize(1);
        PerformanceManagementResult result = results.getFirst();
        assertThat(result.title()).isEqualTo("햄릿");
        assertThat(result.postingCount()).isEqualTo(1);
        assertThat(result.openPostingCount()).isEqualTo(1);
        assertThat(result.applicantCount()).isEqualTo(2);
        assertThat(result.pendingReviewCount()).isEqualTo(1);
        AuditionManagementResult posting = result.postings().getFirst();
        assertThat(posting.phase()).isEqualTo("OPEN");
        assertThat(posting.progress().percent()).isEqualTo(50);
        AuditionRoleManagementResult role = posting.roles().getFirst();
        assertThat(role.applicantCount()).isEqualTo(2);
        assertThat(role.counts().pending()).isEqualTo(1);
        assertThat(role.counts().pass()).isEqualTo(1);
    }

    private Performance savePerformance(long ownerId, String title) {
        Performance performance = new Performance(ownerId, ownerId, title, "서울특별시 종로구 대학로 12");
        performance.addRole("햄릿", "덴마크 왕자");
        entityManager.persist(performance);
        entityManager.flush();
        return performance;
    }

    private Audition saveOpenAudition(Performance performance) {
        Audition audition = new Audition(
                performance.getId(),
                OWNER_ID,
                "햄릿 배우 모집",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31))
        );
        audition.publish(CURRENT_TIME.minusSeconds(3_600));
        entityManager.persist(audition);
        entityManager.flush();
        return audition;
    }

    private AuditionRoleSection saveRoleSection(Audition audition, Performance performance) {
        AuditionRoleSelection selection = new AuditionRoleSelection(
                performance.getRoles().getFirst().getId(),
                new AuditionRoleCondition(2, RoleGender.ANY, 18, 40)
        );
        AuditionRoleSection section = new AuditionRoleSection(
                audition.getId(), new AuditionRoleSelections(false, List.of(selection))
        );
        entityManager.persist(section);
        entityManager.flush();
        return section;
    }

    private AuditionSchedule saveSchedule(Audition audition) {
        AuditionSchedulePlan plan = new AuditionSchedulePlan(
                new RecruitmentPeriod(CURRENT_TIME.minusSeconds(86_400), CURRENT_TIME.plusSeconds(86_400)),
                new ScreeningStagePlans(List.of(
                        new ScreeningStagePlan(null, "1차 서류", LocalDate.of(2026, 9, 1), "")
                ))
        );
        AuditionSchedule schedule = new AuditionSchedule(audition.getId(), plan);
        entityManager.persist(schedule);
        entityManager.flush();
        return schedule;
    }

    private Submission saveSubmission(Audition audition, long roleId, long applicantId) {
        Submission submission = new Submission(
                applicantId,
                CURRENT_TIME.minusSeconds(1_800),
                new AuditionSnapshot(audition.getId(), audition.getTitle()),
                applicantSnapshot(),
                new SelectedRoles(List.of(new SelectedRole(roleId, "햄릿"))),
                new SubmissionFormAnswers(
                        new QuestionAnswers(List.of()),
                        new PhotoRequirementAnswers(List.of()),
                        new VideoRequirementAnswers(List.of())
                )
        );
        entityManager.persist(submission);
        entityManager.flush();
        return submission;
    }

    private ApplicantSnapshot applicantSnapshot() {
        return new ApplicantSnapshot(
                new SubmissionBasicInformation(null, null, null, null, null, null, null, null),
                new SubmissionAdditionalInformation(null, List.of(), null, null, null, null, null, List.of()),
                new SubmissionFieldSnapshot(List.of(), List.of()),
                CURRENT_TIME.minusSeconds(1_800),
                CURRENT_TIME.plusSeconds(86_400)
        );
    }

    private void saveReview(Submission submission, long roleId, long stageId) {
        ScreeningReview review = new ScreeningReview(submission.getSubmissionId(), roleId, stageId);
        review.decide(ScreeningReviewStatus.PASS, null);
        entityManager.persist(review);
    }
}
