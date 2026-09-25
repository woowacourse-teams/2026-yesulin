package art.yesulin.presentation.api.otraudition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.audition.PostingSnapshotVersionGenerator;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.otraudition.OtrScreeningService;
import art.yesulin.application.otraudition.OtrSubmissionInput;
import art.yesulin.application.otraudition.OtrSubmissionService;
import art.yesulin.application.screening.ScreeningCompletionResult;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.domain.otraudition.OtrScreeningCompletionRepository;
import art.yesulin.domain.otraudition.OtrScreeningReviewRepository;
import art.yesulin.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.SubmissionType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:otr-submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, OtrSubmissionControllerTest.FixedClockConfiguration.class})
@AutoConfigureMockMvc
class OtrSubmissionControllerTest {

    private static final MemberPrincipal APPLICANT = new MemberPrincipal(1L, MemberType.APPLICANT, MemberStatus.ACTIVE);
    private static final MemberPrincipal PRODUCER = new MemberPrincipal(2L, MemberType.PRODUCER, MemberStatus.ACTIVE);
    private static final MemberPrincipal OTHER_PRODUCER =
            new MemberPrincipal(3L, MemberType.PRODUCER, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private OtrAuditionRepository auditionRepository;
    @Autowired
    private OtrSubmissionRepository submissionRepository;
    @Autowired
    private OtrScreeningReviewRepository reviewRepository;
    @Autowired
    private OtrScreeningCompletionRepository completionRepository;
    @Autowired
    private ProducerRepository producerRepository;
    @Autowired
    private FileAssetRepository fileAssetRepository;
    @Autowired
    private PostingSnapshotVersionGenerator snapshotVersionGenerator;
    @Autowired
    private AdjustableClock testClock;
    @Autowired
    private OtrSubmissionService submissionService;
    @Autowired
    private OtrScreeningService screeningService;
    @MockitoSpyBean
    private SubmissionConsentDocumentProvider consentDocumentProvider;

    @BeforeEach
    void cleanUp() {
        testClock.set(Instant.parse("2026-09-21T14:59:59Z"));
        reviewRepository.deleteAll();
        completionRepository.deleteAll();
        submissionRepository.deleteAll();
        fileAssetRepository.deleteAll();
        auditionRepository.deleteAll();
        producerRepository.deleteAll();
        producerRepository.saveAndFlush(new Producer(2L, "극단 예술인", "01012345678"));
    }

    @Test
    void publicLinkOpensFormAndSubmissionPersistsOtrType() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 21));
        List<Long> files = createPhotos();
        String url = "/api/v1/otr-auditions/" + audition.getPublicId() + "/submissions";

        mockMvc.perform(get("/api/v1/public/otr-auditions/{id}", audition.getPublicId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true))
                .andExpect(jsonPath("$.producerName").value("극단 예술인"))
                .andExpect(jsonPath("$.roles[0]").value("햄릿"));

        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.submissionId").isNumber());

        assertEquals(SubmissionType.OTR, submissionRepository.findAll().getFirst().getType());

        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OTR_AUDITION_DUPLICATE_SUBMISSION"));
    }

    @Test
    void rejectsExpiredAuditionAndInvalidRole() throws Exception {
        OtrAudition closed = createAudition(LocalDate.of(2026, 9, 20));
        List<Long> files = createPhotos();
        mockMvc.perform(get("/api/v1/public/otr-auditions/{id}", closed.getPublicId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.open").value(false));
        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", closed.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(closed, files, "햄릿")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OTR_AUDITION_CLOSED"));

        OtrAudition open = createAudition(LocalDate.of(2026, 9, 22));
        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", open.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(open, files, "다른 배역")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("OTR_AUDITION_INVALID_INPUT"));
    }

    @Test
    void acceptsOptionalMediaAndRejectsMoreThanThreeOrNonApplicant() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 22));
        List<Long> files = createPhotos();
        String url = "/api/v1/otr-auditions/" + audition.getPublicId() + "/submissions";
        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(audition, files, "햄릿")
                                .replace("[%d,%d,%d]".formatted(files.get(0), files.get(1), files.get(2)), "[]")
                                .replace("[\"https://youtu.be/aaaaaaaaaaa\", \"https://youtu.be/bbbbbbbbbbb\", "
                                        + "\"https://youtu.be/ccccccccccc\"]", "[]")))
                .andExpect(status().isCreated());
        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(audition, files, "햄릿")
                                .replace("[%d,%d,%d]".formatted(files.get(0), files.get(1), files.get(2)),
                                        "[%d,%d,%d,%d]".formatted(files.get(0), files.get(1), files.get(2),
                                                files.get(0)))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsSubmissionIfConsentRecipientChangedAfterPageLoad() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 22));
        List<Long> files = createPhotos();
        Producer producer = producerRepository.findByMemberId(2L).orElseThrow();
        producer.updateCompanyName("새 공연사명");
        producerRepository.saveAndFlush(producer);

        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", audition.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OTR_AUDITION_STALE_POSTING_SNAPSHOT"));
    }

    @Test
    void producerScreensExistingOtrSubmissionAndClosesItsRole() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 22));
        List<Long> files = createPhotos();
        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", audition.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isCreated());

        String base = "/api/v1/otr-auditions/" + audition.getPublicId()
                + "/roles/1/screening-rounds/1";
        String submissionId = submissionRepository.findAll().getFirst().getPublicId().toString();
        assertTrue(submissionRepository.existsSubmittedPhotoOwnedByProducer(files.getFirst(), PRODUCER.memberId()));
        assertFalse(submissionRepository.existsSubmittedPhotoOwnedByProducer(
                files.getFirst(), OTHER_PRODUCER.memberId()));
        mockMvc.perform(get(base + "/submissions").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role.name").value("햄릿"))
                .andExpect(jsonPath("$.role.counts.pending").value(1))
                .andExpect(jsonPath("$.submissions[0].id").value(submissionId))
                .andExpect(jsonPath("$.submissions[0].photos.length()").value(3));
        mockMvc.perform(get(base + "/submissions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, OTHER_PRODUCER))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/otr-auditions/{id}/roles/2/screening-rounds/1/submissions",
                        audition.getPublicId()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissions.length()").value(0));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/otr-auditions/{id}/roles/2/screening-rounds/1/reviews", audition.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionIds\":[\"" + submissionId + "\"],\"status\":\"PASS\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(get(base + "/submissions/" + submissionId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submission.name").value("홍길동"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(base + "/reviews")
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionIds\":[\"" + submissionId + "\"],\"status\":\"PASS\",\"note\":\"좋음\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews[0].status").value("PASS"));
        mockMvc.perform(get(base + "/submissions?work=DONE&status=PASS")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role.counts.pass").value(1))
                .andExpect(jsonPath("$.role.canComplete").value(false))
                .andExpect(jsonPath("$.submissions.length()").value(1));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(base + "/completion")
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SCREENING_ROUND_NOT_READY"));
        testClock.set(Instant.parse("2026-09-22T15:00:00Z"));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(base + "/completion")
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.acceptedCount").value(1))
                .andExpect(jsonPath("$.allRoundsClosed").value(true));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(base + "/reviews")
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"submissionIds\":[\"" + submissionId + "\"],\"status\":\"FAIL\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void screeningCompletionWaitsForSubmissionAdmittedBeforeDeadlineToCommit() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 21));
        OtrSubmissionInput input = new OtrSubmissionInput(SubmissionType.OTR,
                snapshotVersionGenerator.generate(audition.getPublicId(), "극단 예술인"), "햄릿",
                new SubmissionBasicInformation("홍길동", 175, 67, LocalDate.of(2000, 1, 1),
                        SubmissionGender.MALE, "010-1234-5678", "actor@example.com", "서울특별시 종로구"),
                new SubmissionAdditionalInformation(null, null, null, List.of(), null, null, null, null,
                        null, List.of()), List.of(), List.of(), true, true);
        CountDownLatch admitted = new CountDownLatch(1);
        CountDownLatch releaseSubmission = new CountDownLatch(1);
        CountDownLatch completionStarted = new CountDownLatch(1);
        doAnswer(invocation -> {
            admitted.countDown();
            try {
                assertTrue(releaseSubmission.await(10, TimeUnit.SECONDS));
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new AssertionError(exception);
            }
            return invocation.callRealMethod();
        }).when(consentDocumentProvider).currentFor(anyLong(), anyString(), any(Instant.class));

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> submission = executor.submit(() -> submissionService.submit(
                    APPLICANT.memberId(), audition.getPublicId(), input));
            try {
                assertTrue(admitted.await(10, TimeUnit.SECONDS));
                testClock.set(Instant.parse("2026-09-21T15:00:00Z"));
                Future<ScreeningCompletionResult> completion = executor.submit(() -> {
                    completionStarted.countDown();
                    return screeningService.complete(PRODUCER.memberId(), audition.getPublicId(), 1, 1);
                });
                assertTrue(completionStarted.await(10, TimeUnit.SECONDS));
                assertThrows(TimeoutException.class, () -> completion.get(300, TimeUnit.MILLISECONDS));
                releaseSubmission.countDown();
                submission.get(10, TimeUnit.SECONDS);
                assertEquals(1, completion.get(10, TimeUnit.SECONDS).unselectedCount());
                assertEquals(1, screeningService.findBoard(PRODUCER.memberId(), audition.getPublicId(), 1, 1,
                        null).role().counts().pending());
            } finally {
                releaseSubmission.countDown();
            }
        }
    }

    private OtrAudition createAudition(LocalDate deadline) {
        String otrId = deadline.format(DateTimeFormatter.BASIC_ISO_DATE);
        return auditionRepository.saveAndFlush(new OtrAudition(2L, otrId, "햄릿 배우 모집",
                List.of("햄릿", "오필리어"), deadline));
    }

    private List<Long> createPhotos() {
        return List.of(1, 2, 3).stream().map(index -> {
            FileAsset file = new FileAsset("private/actor-photos/test-" + index, 1L,
                    new FileMetadata("photo.jpg", "image/jpeg", 1024L));
            file.completeUpload("image/jpeg", 1024L);
            return fileAssetRepository.saveAndFlush(file).getId();
        }).toList();
    }

    private String request(OtrAudition audition, List<Long> fileIds, String role) {
        return """
                {
                  "type": "OTR",
                  "selectedRole": "%s",
                  "postingSnapshotVersion": "%s",
                  "basicInformation": {
                    "name": "홍길동", "height": 175, "weight": 67, "birthDate": "2000-01-01",
                    "gender": "MALE", "phone": "010-1234-5678", "email": "actor@example.com", "address": "서울특별시 종로구"
                  },
                  "additionalInformation": {
                    "educationLevel": "UNIVERSITY", "school": "한국예술종합학교", "major": "연기과",
                    "links": ["https://example.com/actor"], "nationality": "대한민국", "coverLetter": "자기소개",
                    "specialty": "현대무용", "hobbies": "영화 감상", "militaryServiceStatus": "NOT_APPLICABLE",
                    "careers": [{"year": 2025, "title": "햄릿", "roleName": "오필리어"}]
                  },
                  "photoFileIds": [%d,%d,%d],
                  "videoUrls": ["https://youtu.be/aaaaaaaaaaa", "https://youtu.be/bbbbbbbbbbb", "https://youtu.be/ccccccccccc"],
                  "privacyCollectionAndUseAgreed": true, "thirdPartyProvisionAgreed": true
                }
                """.formatted(role,
                snapshotVersionGenerator.generate(audition.getPublicId(), "극단 예술인"),
                fileIds.get(0), fileIds.get(1), fileIds.get(2));
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        AdjustableClock fixedOtrClock() {
            return new AdjustableClock(new AtomicReference<>(Instant.parse("2026-09-21T14:59:59Z")),
                    ZoneOffset.UTC);
        }
    }

    static class AdjustableClock extends Clock {

        private final AtomicReference<Instant> instant;
        private final ZoneId zone;

        AdjustableClock(AtomicReference<Instant> instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        void set(Instant value) {
            instant.set(value);
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId value) {
            return new AdjustableClock(instant, value);
        }

        @Override
        public Instant instant() {
            return instant.get();
        }
    }
}
