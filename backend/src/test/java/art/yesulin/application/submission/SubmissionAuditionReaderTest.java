package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionErrorCode;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.AdditionalQuestion;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirement;
import art.yesulin.domain.audition.form.VideoRequirement;
import art.yesulin.domain.audition.role.AuditionRole;
import art.yesulin.domain.audition.role.AuditionRoleSection;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionSchedule;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.audition.schedule.RecruitmentPeriod;
import art.yesulin.domain.performance.Performance;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.performance.PerformanceRole;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SubmissionAuditionReaderTest {

    private static final UUID PUBLIC_AUDITION_ID = UUID.fromString("1c9ad643-21f6-4c13-a08f-cb8e986943d4");
    private static final long AUDITION_ID = 10L;
    private static final long PERFORMANCE_ID = 20L;

    private AuditionRepository auditionRepository;
    private PerformanceRepository performanceRepository;
    private ProducerRepository producerRepository;
    private AuditionRoleSectionRepository roleSectionRepository;
    private AuditionScheduleRepository scheduleRepository;
    private AuditionFormRepository formRepository;
    private SubmissionAuditionReader reader;

    @BeforeEach
    void setUp() {
        auditionRepository = mock(AuditionRepository.class);
        performanceRepository = mock(PerformanceRepository.class);
        producerRepository = mock(ProducerRepository.class);
        roleSectionRepository = mock(AuditionRoleSectionRepository.class);
        scheduleRepository = mock(AuditionScheduleRepository.class);
        formRepository = mock(AuditionFormRepository.class);
        reader = new SubmissionAuditionReader(
                auditionRepository,
                performanceRepository,
                producerRepository,
                roleSectionRepository,
                scheduleRepository,
                formRepository
        );
    }

    @Test
    void readsPublishedAuditionAsSubmissionDefinition() {
        Audition audition = publishedAudition();
        Performance performance = performance();
        Producer producer = producer();
        AuditionRoleSection roleSection = roleSection();
        AuditionSchedule schedule = schedule();
        AuditionForm form = form();
        when(auditionRepository.findByPublicId(PUBLIC_AUDITION_ID)).thenReturn(Optional.of(audition));
        when(performanceRepository.findById(PERFORMANCE_ID)).thenReturn(Optional.of(performance));
        when(producerRepository.findByMemberId(30L)).thenReturn(Optional.of(producer));
        when(roleSectionRepository.findByAuditionId(AUDITION_ID)).thenReturn(Optional.of(roleSection));
        when(scheduleRepository.findByAuditionId(AUDITION_ID)).thenReturn(Optional.of(schedule));
        when(formRepository.findByAuditionId(AUDITION_ID)).thenReturn(Optional.of(form));

        SubmissionAudition result = reader.read(PUBLIC_AUDITION_ID);

        assertEquals(AUDITION_ID, result.auditionId());
        assertEquals(PUBLIC_AUDITION_ID, result.publicAuditionId());
        assertEquals("햄릿 오디션", result.title());
        assertEquals("햄릿", result.performanceTitle());
        assertEquals("테스트 극단", result.companyName());
        assertEquals(40L, result.posterFileId());
        assertEquals("햄릿", result.roles().getFirst().name());
        assertEquals("지원 동기는 무엇인가요?", result.form().questions().getFirst().question());
        assertEquals("정면 사진", result.form().photoRequirements().getFirst().description());
        assertEquals("자유 연기 영상", result.form().videoRequirements().getFirst().description());
        assertEquals(List.of(BasicInformationField.NAME), result.form().basicFields());
        assertEquals(List.of(AdditionalInformationField.SPECIALTY), result.form().additionalFields());
    }

    @Test
    void hidesUnpublishedAudition() {
        Audition audition = mock(Audition.class);
        when(audition.isPublished()).thenReturn(false);
        when(auditionRepository.findByPublicId(PUBLIC_AUDITION_ID)).thenReturn(Optional.of(audition));

        BusinessException exception = assertThrows(
                BusinessException.class, () -> reader.read(PUBLIC_AUDITION_ID)
        );

        assertEquals(AuditionErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void failsWhenPublishedAuditionHasBrokenRoleReference() {
        Audition audition = publishedAudition();
        Performance performance = mock(Performance.class);
        AuditionRoleSection roleSection = roleSection();
        AuditionSchedule schedule = schedule();
        AuditionForm form = form();
        Producer producer = producer();
        when(performance.getRoles()).thenReturn(List.of());
        when(performance.getOwnerId()).thenReturn(30L);
        when(auditionRepository.findByPublicId(PUBLIC_AUDITION_ID)).thenReturn(Optional.of(audition));
        when(performanceRepository.findById(PERFORMANCE_ID)).thenReturn(Optional.of(performance));
        when(producerRepository.findByMemberId(30L)).thenReturn(Optional.of(producer));
        when(roleSectionRepository.findByAuditionId(AUDITION_ID)).thenReturn(Optional.of(roleSection));
        when(scheduleRepository.findByAuditionId(AUDITION_ID)).thenReturn(Optional.of(schedule));
        when(formRepository.findByAuditionId(AUDITION_ID)).thenReturn(Optional.of(form));

        assertThrows(IllegalStateException.class, () -> reader.read(PUBLIC_AUDITION_ID));
    }

    private Audition publishedAudition() {
        Audition audition = mock(Audition.class);
        when(audition.isPublished()).thenReturn(true);
        when(audition.getId()).thenReturn(AUDITION_ID);
        when(audition.getPublicId()).thenReturn(PUBLIC_AUDITION_ID);
        when(audition.getPerformanceId()).thenReturn(PERFORMANCE_ID);
        when(audition.getTitle()).thenReturn("햄릿 오디션");
        return audition;
    }

    private Performance performance() {
        Performance performance = mock(Performance.class);
        PerformanceRole role = mock(PerformanceRole.class);
        when(role.getId()).thenReturn(100L);
        when(role.getName()).thenReturn("햄릿");
        when(performance.getRoles()).thenReturn(List.of(role));
        when(performance.getOwnerId()).thenReturn(30L);
        when(performance.getPosterFileId()).thenReturn(40L);
        when(performance.getTitle()).thenReturn("햄릿");
        return performance;
    }

    private Producer producer() {
        Producer producer = mock(Producer.class);
        when(producer.getCompanyName()).thenReturn("테스트 극단");
        return producer;
    }

    private AuditionRoleSection roleSection() {
        AuditionRoleSection roleSection = mock(AuditionRoleSection.class);
        AuditionRole role = mock(AuditionRole.class);
        when(role.getId()).thenReturn(1L);
        when(role.getPerformanceRoleId()).thenReturn(100L);
        when(roleSection.isMultipleRoleApplicationsAllowed()).thenReturn(false);
        when(roleSection.getRoles()).thenReturn(List.of(role));
        return roleSection;
    }

    private AuditionSchedule schedule() {
        AuditionSchedule schedule = mock(AuditionSchedule.class);
        when(schedule.getRecruitmentPeriod()).thenReturn(new RecruitmentPeriod(
                Instant.parse("2026-09-01T00:00:00Z"),
                Instant.parse("2026-09-10T00:00:00Z")
        ));
        return schedule;
    }

    private AuditionForm form() {
        AuditionForm form = mock(AuditionForm.class);
        AdditionalQuestion question = mock(AdditionalQuestion.class);
        PhotoRequirement photo = mock(PhotoRequirement.class);
        VideoRequirement video = mock(VideoRequirement.class);
        when(question.getId()).thenReturn(1L);
        when(question.getQuestion()).thenReturn("지원 동기는 무엇인가요?");
        when(question.isRequired()).thenReturn(true);
        when(photo.getId()).thenReturn(2L);
        when(photo.getDescription()).thenReturn("정면 사진");
        when(photo.getCount()).thenReturn(1);
        when(video.getId()).thenReturn(3L);
        when(video.getDescription()).thenReturn("자유 연기 영상");
        when(form.getBasicFields()).thenReturn(List.of(BasicInformationField.NAME));
        when(form.getAdditionalFields()).thenReturn(List.of(AdditionalInformationField.SPECIALTY));
        when(form.getAdditionalQuestions()).thenReturn(List.of(question));
        when(form.getPhotoRequirements()).thenReturn(List.of(photo));
        when(form.getVideoRequirements()).thenReturn(List.of(video));
        return form;
    }
}
