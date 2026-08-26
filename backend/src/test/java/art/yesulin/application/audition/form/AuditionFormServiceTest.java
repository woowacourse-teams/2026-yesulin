package art.yesulin.application.audition.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionErrorCode;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-form;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
class AuditionFormServiceTest {

    private static final long OWNER_ID = 1L;

    @Autowired
    private AuditionFormService formService;

    @Autowired
    private AuditionFormRepository formRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileService fileService;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @BeforeEach
    void cleanUp() {
        formRepository.deleteAll();
        auditionRepository.deleteAll();
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void savesFormAndKeepsExistingRequirementIdentityWhenItChanges() {
        Audition audition = saveAudition();
        AuditionFormResult saved = formService.save(OWNER_ID, audition.getPublicId(), createCommand());
        final long firstPhotoId = saved.photoRequirements().get(0).id();
        final long secondPhotoId = saved.photoRequirements().get(1).id();
        final long videoId = saved.videoRequirements().get(0).id();
        final long questionId = saved.additionalQuestions().get(0).id();
        SaveAuditionFormCommand changeCommand = new SaveAuditionFormCommand(
                List.of("email", "name"),
                List.of("career"),
                List.of(
                        new SavePhotoRequirementCommand(secondPhotoId, "측면 사진", 2),
                        new SavePhotoRequirementCommand(null, "전신 사진", 1)
                ),
                List.of(new SaveVideoRequirementCommand(videoId, "자유 연기 영상")),
                List.of(new SaveAdditionalQuestionCommand(questionId, "지원 동기를 알려주세요.", false))
        );

        AuditionFormResult changed = formService.save(OWNER_ID, audition.getPublicId(), changeCommand);

        assertEquals(List.of("NAME", "EMAIL"), changed.basicFields());
        assertEquals(List.of("CAREER"), changed.additionalFields());
        assertEquals(secondPhotoId, changed.photoRequirements().get(0).id());
        assertNotEquals(firstPhotoId, changed.photoRequirements().get(1).id());
        assertEquals(videoId, changed.videoRequirements().get(0).id());
        assertEquals(questionId, changed.additionalQuestions().get(0).id());
        assertEquals(2_000, changed.additionalQuestions().get(0).answerMaxLength());
        assertEquals(changed, formService.find(OWNER_ID, audition.getPublicId()));
    }

    @Test
    void hidesAnotherOwnersForm() {
        Audition audition = saveAudition();
        formService.save(OWNER_ID, audition.getPublicId(), createCommand());

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> formService.find(2L, audition.getPublicId())
        );

        assertEquals(AuditionErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void serializesConcurrentInitialFormSaves() throws Exception {
        Audition audition = saveAudition();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<AuditionFormResult> first = executor.submit(
                    () -> saveAfterSignal(start, audition.getPublicId(), createCommand())
            );
            Future<AuditionFormResult> second = executor.submit(
                    () -> saveAfterSignal(start, audition.getPublicId(), createCommand())
            );
            start.countDown();

            first.get(5, TimeUnit.SECONDS);
            second.get(5, TimeUnit.SECONDS);

            assertEquals(1, formRepository.count());
        } finally {
            executor.shutdownNow();
        }
    }

    private AuditionFormResult saveAfterSignal(
            CountDownLatch start,
            UUID auditionId,
            SaveAuditionFormCommand command
    ) throws InterruptedException {
        start.await();
        return formService.save(OWNER_ID, auditionId, command);
    }

    private Audition saveAudition() {
        PerformanceResult performance = performanceService.create(
                OWNER_ID,
                new CreatePerformanceCommand(uploadReadyImage(), "햄릿", "서울특별시 종로구 대학로 12", List.of())
        );
        return auditionRepository.save(new Audition(
                performance.id(),
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
    }

    private long uploadReadyImage() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }

    private SaveAuditionFormCommand createCommand() {
        return new SaveAuditionFormCommand(
                List.of("NAME", "EMAIL"),
                List.of("CAREER", "LINK"),
                List.of(
                        new SavePhotoRequirementCommand(null, "정면 사진", 2),
                        new SavePhotoRequirementCommand(null, "측면 사진", 1)
                ),
                List.of(new SaveVideoRequirementCommand(null, "자유 연기 영상")),
                List.of(new SaveAdditionalQuestionCommand(null, "지원 동기를 알려주세요.", true))
        );
    }
}
