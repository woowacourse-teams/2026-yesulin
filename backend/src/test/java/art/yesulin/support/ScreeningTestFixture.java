package art.yesulin.support;

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
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.submission.ApplicantSnapshot;
import art.yesulin.domain.submission.AuditionSnapshot;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.PhotoRequirementAnswer;
import art.yesulin.domain.submission.PhotoRequirementAnswers;
import art.yesulin.domain.submission.QuestionAnswer;
import art.yesulin.domain.submission.QuestionAnswers;
import art.yesulin.domain.submission.SelectedRole;
import art.yesulin.domain.submission.SelectedRoles;
import art.yesulin.domain.submission.Submission;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionCareer;
import art.yesulin.domain.submission.SubmissionFieldSnapshot;
import art.yesulin.domain.submission.SubmissionFormAnswers;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.domain.submission.VideoRequirementAnswer;
import art.yesulin.domain.submission.VideoRequirementAnswers;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ScreeningTestFixture {

    private static final Instant SUBMITTED_AT = Instant.parse("2026-09-01T03:15:00Z");
    private static final Instant RECRUITMENT_END_AT = Instant.parse("2026-09-10T14:59:00Z");

    private final PerformanceRepository performanceRepository;
    private final AuditionRepository auditionRepository;
    private final AuditionRoleSectionRepository roleSectionRepository;
    private final AuditionScheduleRepository scheduleRepository;
    private final SubmissionRepository submissionRepository;
    private final FileAssetRepository fileAssetRepository;

    public ScreeningTestFixture(
            PerformanceRepository performanceRepository,
            AuditionRepository auditionRepository,
            AuditionRoleSectionRepository roleSectionRepository,
            AuditionScheduleRepository scheduleRepository,
            SubmissionRepository submissionRepository,
            FileAssetRepository fileAssetRepository
    ) {
        this.performanceRepository = performanceRepository;
        this.auditionRepository = auditionRepository;
        this.roleSectionRepository = roleSectionRepository;
        this.scheduleRepository = scheduleRepository;
        this.submissionRepository = submissionRepository;
        this.fileAssetRepository = fileAssetRepository;
    }

    public Fixture save(long ownerId, UUID submissionId, int stageCount) {
        long posterFileId = saveReadyImage(ownerId, "performances/poster-" + UUID.randomUUID());
        Performance performance = new Performance(ownerId, posterFileId, "햄릿", "서울특별시 종로구");
        performance.addRole("햄릿", "덴마크의 왕자");
        performanceRepository.saveAndFlush(performance);
        Audition audition = auditionRepository.saveAndFlush(new Audition(
                performance.getId(), ownerId, "햄릿 오디션", new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        AuditionRoleSection roleSection = roleSectionRepository.saveAndFlush(new AuditionRoleSection(
                audition.getId(), new AuditionRoleSelections(false, List.of(new AuditionRoleSelection(
                        performance.getRoles().getFirst().getId(),
                        new AuditionRoleCondition(1, RoleGender.ANY, 0, 100)
                )))
        ));
        scheduleRepository.saveAndFlush(new AuditionSchedule(
                audition.getId(), new AuditionSchedulePlan(
                        new RecruitmentPeriod(
                                Instant.parse("2026-09-01T00:00:00Z"), RECRUITMENT_END_AT
                        ),
                        new ScreeningStagePlans(stagePlans(stageCount))
                )
        ));
        Fixture fixture = new Fixture(
                performance.getId(), audition.getId(), roleSection.getRoles().getFirst().getId(), submissionId
        );
        saveSubmission(fixture, 10L, submissionId, "김하린", SubmissionGender.FEMALE);
        return fixture;
    }

    public Submission saveSubmission(
            Fixture fixture,
            long applicantId,
            UUID submissionId,
            String name,
            SubmissionGender gender
    ) {
        long photoFileId = saveReadyImage(applicantId, "submissions/profile-" + UUID.randomUUID());
        Performance performance = performanceRepository.findById(fixture.performanceId()).orElseThrow();
        Audition audition = auditionRepository.findById(fixture.auditionId()).orElseThrow();
        ApplicantSnapshot applicant = new ApplicantSnapshot(
                new SubmissionBasicInformation(
                        name, 166, 52, LocalDate.of(1999, 4, 3), gender,
                        "010-1234-5678", "applicant@example.com", "서울특별시 종로구"
                ),
                new SubmissionAdditionalInformation(
                        "한국예술종합학교", List.of("https://example.com"), "대한민국", "자기소개",
                        "현대무용", "영화 감상", MilitaryServiceStatus.NOT_APPLICABLE,
                        List.of(new SubmissionCareer(2025, "리어왕", "코델리아"))
                ),
                new SubmissionFieldSnapshot(List.of(), List.of()),
                SUBMITTED_AT,
                RECRUITMENT_END_AT
        );
        SubmissionFormAnswers answers = new SubmissionFormAnswers(
                new QuestionAnswers(List.of(new QuestionAnswer(1L, "지원 동기는?", "작품에 공감했습니다."))),
                new PhotoRequirementAnswers(List.of(new PhotoRequirementAnswer(1L, "정면 사진", photoFileId))),
                new VideoRequirementAnswers(List.of(new VideoRequirementAnswer(
                        1L, "자유 연기", "https://youtu.be/abcdefghijk"
                )))
        );
        return submissionRepository.saveAndFlush(new Submission(
                submissionId, applicantId, SUBMITTED_AT,
                new AuditionSnapshot(
                        fixture.auditionId(),
                        audition.getPublicId(),
                        "햄릿 오디션",
                        performance.getTitle(),
                        "테스트 극단",
                        performance.getPosterFileId(),
                        performance.getOwnerId()
                ), applicant,
                new SelectedRoles(List.of(new SelectedRole(fixture.roleId(), "햄릿"))), answers
        ));
    }

    private List<ScreeningStagePlan> stagePlans(int count) {
        List<ScreeningStagePlan> plans = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            plans.add(new ScreeningStagePlan(
                    null, (index + 1) + "차 전형", LocalDate.of(2026, 9, 12 + index), ""
            ));
        }
        return List.copyOf(plans);
    }

    private long saveReadyImage(long ownerId, String objectKey) {
        FileAsset file = new FileAsset(objectKey, ownerId, new FileMetadata("image.jpg", "image/jpeg", 1_024L));
        file.completeUpload("image/jpeg", 1_024L);
        return fileAssetRepository.saveAndFlush(file).getId();
    }

    public record Fixture(long performanceId, long auditionId, long roleId, UUID submissionId) {
    }
}
