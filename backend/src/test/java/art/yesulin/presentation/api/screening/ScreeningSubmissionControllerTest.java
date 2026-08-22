package art.yesulin.presentation.api.screening;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.role.AuditionRoleCondition;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSelection;
import art.yesulin.domain.audition.role.AuditionRoleSelections;
import art.yesulin.domain.audition.role.RoleGender;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionSchedulePlan;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.audition.schedule.ScreeningStagePlan;
import art.yesulin.domain.audition.schedule.ScreeningStagePlans;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class ScreeningSubmissionControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID);
    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ScreeningReviewRepository reviewRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @BeforeEach
    void cleanUp() {
        jdbcTemplate.update("delete from screening_submission_videos");
        jdbcTemplate.update("delete from screening_submission_photos");
        jdbcTemplate.update("delete from screening_submission_careers");
        jdbcTemplate.update("delete from screening_submission_roles");
        jdbcTemplate.update("delete from screening_submission_snapshots");
        reviewRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void findsScreeningBoardAndDefaultsMissingReviewToPending() throws Exception {
        ScreeningFixture fixture = saveScreeningFixture();

        mockMvc.perform(get(
                        "/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions",
                        fixture.roleId(), 1
                ).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performance.title").value("햄릿"))
                .andExpect(jsonPath("$.posting.id").value(fixture.auditionPublicId().toString()))
                .andExpect(jsonPath("$.role.name").value("햄릿"))
                .andExpect(jsonPath("$.rounds.length()").value(2))
                .andExpect(jsonPath("$.submissions[0].id").value(SUBMISSION_ID.toString()))
                .andExpect(jsonPath("$.submissions[0].review.status").value("PENDING"))
                .andExpect(jsonPath("$.submissions[0].photos[0].url")
                        .value("https://storage.test/downloads/files/applicant.png"));
    }

    @Test
    void findsSubmissionDetailOnlyInsideCurrentRoleAndRound() throws Exception {
        ScreeningFixture fixture = saveScreeningFixture();

        mockMvc.perform(get(
                        "/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions/{submissionId}",
                        fixture.roleId(), 1, SUBMISSION_ID
                ).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submission.name").value("김하린"))
                .andExpect(jsonPath("$.submission.reviewHistory.1.status").value("PENDING"));

        mockMvc.perform(get(
                        "/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions/{submissionId}",
                        fixture.roleId(), 1, UUID.randomUUID()
                ).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNotFound());
    }

    @Test
    void includesOnlyFirstRoundPassesInSecondRound() throws Exception {
        ScreeningFixture fixture = saveScreeningFixture();
        ScreeningReview review = new ScreeningReview(SUBMISSION_ID, fixture.roleId(), fixture.firstStageId());
        review.decide(ScreeningReviewStatus.PASS, null);
        reviewRepository.save(review);

        mockMvc.perform(get(
                        "/api/v1/audition-roles/{roleId}/screening-rounds/{round}/submissions",
                        fixture.roleId(), 2
                ).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions.length()").value(1))
                .andExpect(jsonPath("$.submissions[0].review.status").value("PENDING"))
                .andExpect(jsonPath("$.submissions[0].reviewHistory.1.status").value("PASS"));
    }

    private ScreeningFixture saveScreeningFixture() {
        FileAsset poster = saveReadyFile("files/poster.png", OWNER_ID, "poster.png");
        FileAsset applicantPhoto = saveReadyFile("files/applicant.png", 2L, "applicant.png");
        Performance performance = new Performance(OWNER_ID, poster.getId(), "햄릿", "서울시 종로구 대학로 1");
        performance.addRole("햄릿", "복수심을 품은 덴마크 왕자");
        performance = performanceRepository.saveAndFlush(performance);
        Audition audition = auditionRepository.save(new Audition(
                performance.getId(),
                OWNER_ID,
                "햄릿 배우 모집",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        long performanceRoleId = performance.getRoles().getFirst().getId();
        AuditionRoleSection roleSection = roleSectionRepository.saveAndFlush(new AuditionRoleSection(
                audition.getId(),
                new AuditionRoleSelections(false, List.of(new AuditionRoleSelection(
                        performanceRoleId, new AuditionRoleCondition(2, RoleGender.MALE, 20, 35)
                )))
        ));
        AuditionSchedule schedule = scheduleRepository.saveAndFlush(new AuditionSchedule(
                audition.getId(),
                new AuditionSchedulePlan(
                        new RecruitmentPeriod(
                                Instant.parse("2026-09-01T00:00:00Z"),
                                Instant.parse("2026-09-10T00:00:00Z")
                        ),
                        new ScreeningStagePlans(List.of(
                                new ScreeningStagePlan(null, "1차 서류", LocalDate.of(2026, 9, 12), ""),
                                new ScreeningStagePlan(null, "2차 실기", LocalDate.of(2026, 9, 14), "")
                        ))
                )
        ));
        long roleId = roleSection.getRoles().getFirst().getId();
        insertSubmission(audition.getId(), roleId, applicantPhoto.getId());
        return new ScreeningFixture(audition.getPublicId(), roleId, schedule.getStages().getFirst().getId());
    }

    private FileAsset saveReadyFile(String objectKey, long ownerId, String filename) {
        FileAsset fileAsset = new FileAsset(objectKey, ownerId, new FileMetadata(filename, "image/png", 10L));
        fileAsset.completeUpload("image/png", 10L);
        return fileAssetRepository.save(fileAsset);
    }

    private void insertSubmission(long auditionId, long roleId, long photoFileId) {
        jdbcTemplate.update("""
                insert into screening_submission_snapshots (
                    public_id, audition_id, name, gender, birth_date, height, weight, phone, email, school,
                    submitted_at, cover_letter, motivation
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                SUBMISSION_ID.toString(), auditionId, "김하린", "FEMALE", LocalDate.of(1999, 4, 12), 166, 52,
                "010-2468-1357", "harin@example.com", "한국예술종합학교", Instant.parse("2026-08-12T01:30:00Z"),
                "인물의 작은 선택을 세심하게 표현합니다.", "작품의 방향에 공감해 지원했습니다."
        );
        long submissionId = jdbcTemplate.queryForObject(
                "select id from screening_submission_snapshots where public_id = ?",
                Long.class,
                SUBMISSION_ID.toString()
        );
        jdbcTemplate.update(
                "insert into screening_submission_roles (submission_id, audition_role_id) values (?, ?)",
                submissionId, roleId
        );
        jdbcTemplate.update("""
                insert into screening_submission_careers (
                    submission_id, career_order, career_year, career_title, career_part
                ) values (?, ?, ?, ?, ?)
                """, submissionId, 0, 2025, "푸른 방", "윤서");
        jdbcTemplate.update("""
                insert into screening_submission_photos (submission_id, photo_order, photo_label, file_id)
                values (?, ?, ?, ?)
                """, submissionId, 0, "프로필 사진", photoFileId);
        jdbcTemplate.update("""
                insert into screening_submission_videos (submission_id, video_order, video_label, video_url)
                values (?, ?, ?, ?)
                """, submissionId, 0, "자유 연기", "https://youtu.be/aqz-KE-bpKQ");
    }

    private record ScreeningFixture(UUID auditionPublicId, long roleId, long firstStageId) {
    }
}
