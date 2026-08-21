package art.yesulin.application.screening;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
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
import art.yesulin.domain.screening.ScreeningReviewErrorCode;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:screening-review;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class ScreeningReviewServiceTest {

    private static final long OWNER_ID = 1L;
    private static final UUID SUBMISSION_ID = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");

    @Autowired
    private ScreeningReviewService screeningReviewService;

    @Autowired
    private ScreeningReviewRepository screeningReviewRepository;

    @Autowired
    private AuditionScheduleRepository scheduleRepository;

    @Autowired
    private AuditionRoleSectionRepository roleSectionRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @BeforeEach
    void cleanUp() {
        screeningReviewRepository.deleteAll();
        scheduleRepository.deleteAll();
        roleSectionRepository.deleteAll();
        auditionRepository.deleteAll();
    }

    @Test
    void savesReviewForEachSubmissionRoleAndRound() {
        long roleId = saveScreeningFixture();

        ScreeningReviewsResult firstRound = screeningReviewService.save(
                OWNER_ID,
                roleId,
                1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "ETC", "추가 논의", "발성 확인 필요")
        );
        screeningReviewService.save(
                OWNER_ID,
                roleId,
                2,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
        );
        assertEquals("ETC", firstRound.reviews().getFirst().status());
        assertEquals("추가 논의", firstRound.reviews().getFirst().memo());
        assertEquals("발성 확인 필요", firstRound.reviews().getFirst().note());
        assertEquals(2, screeningReviewRepository.count());
    }

    @Test
    void changesStatusAndKeepsInternalMemo() {
        long roleId = saveScreeningFixture();
        screeningReviewService.save(
                OWNER_ID,
                roleId,
                1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "ETC", "추가 논의", "발성 확인 필요")
        );

        ScreeningReviewsResult result = screeningReviewService.save(
                OWNER_ID,
                roleId,
                1,
                new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
        );

        assertEquals("PASS", result.reviews().getFirst().status());
        assertEquals("", result.reviews().getFirst().memo());
        assertEquals("발성 확인 필요", result.reviews().getFirst().note());
        assertEquals(1, screeningReviewRepository.count());
    }

    @Test
    void hidesAnotherOwnersScreeningContext() {
        long roleId = saveScreeningFixture();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> screeningReviewService.save(
                        2L,
                        roleId,
                        1,
                        new SaveScreeningReviewsCommand(List.of(SUBMISSION_ID), "PASS", null, null)
                )
        );

        assertEquals(ScreeningReviewErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    private long saveScreeningFixture() {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        AuditionRoleSection roleSection = roleSectionRepository.save(new AuditionRoleSection(
                audition.getId(),
                new AuditionRoleSelections(false, List.of(new AuditionRoleSelection(
                        1L, new AuditionRoleCondition(1, RoleGender.ANY, 0, 100)
                )))
        ));
        scheduleRepository.save(new AuditionSchedule(
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
        return roleSection.getRoles().getFirst().getId();
    }
}
