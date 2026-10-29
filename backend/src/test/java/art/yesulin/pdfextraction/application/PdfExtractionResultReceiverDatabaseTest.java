package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.NOW;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.command;
import static art.yesulin.pdfextraction.application.PdfExtractionFixtures.manifest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.pdfextraction.application.ai.PdfAiQueueService;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayload;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionStatus;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:pdf-extraction-receiver;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=validate",
        "yesulin.pdf-extraction.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PdfExtractionResultReceiver.class, PdfExtractionResultParser.class,
        PdfExtractionResultReceiverDatabaseTest.TestConfig.class, QueryDslConfiguration.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PdfExtractionResultReceiverDatabaseTest {

    @MockitoBean
    private PdfAiQueueService aiQueue;

    @Autowired
    private PdfExtractionResultReceiver receiver;

    @Autowired
    private PdfExtractionJobRepository jobs;

    @Autowired
    private PdfExtractionPayloadRepository payloads;

    @Autowired
    private MemberRepository members;

    @Autowired
    private PdfExtractionStorage storage;

    @Autowired
    private RecordingListener listener;

    private PdfExtractionJob job;

    @BeforeEach
    void setUp() {
        payloads.deleteAllInBatch();
        jobs.deleteAllInBatch();
        listener.reset();
        Member owner = members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE));
        job = jobs.save(new PdfExtractionJob(owner.getId(), "a.pdf", 100, NOW, NOW.plusSeconds(600)));
    }

    @Test
    void eventListenerFailureRollsBackPayloadAndJobChangesSoRetryCanSucceed() {
        listener.failNext();

        assertThrows(IllegalStateException.class, () ->
                receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문"))));

        PdfExtractionJob afterFailure = jobs.findById(job.getId()).orElseThrow();
        assertEquals(PdfExtractionStatus.UPLOADING, afterFailure.getStatus());
        assertNull(afterFailure.getUploadedAt());
        assertTrue(payloads.findById(job.getId()).isEmpty());

        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문")));

        assertEquals(PdfExtractionStatus.COMPLETED, jobs.findById(job.getId()).orElseThrow().getStatus());
        assertTrue(payloads.findById(job.getId()).isPresent());
        assertEquals(List.of(new PdfExtractionCompletedEvent(job.getId(), job.getOwnerId(), "본문")),
                listener.received());
    }

    @Test
    void duplicateIsIdempotentAndDifferentPayloadConflictsAgainstTheStoredRow() {
        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문")));
        final String storedJson = payloads.findById(job.getId()).orElseThrow().getPayloadJson();

        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "본문")));
        assertThrows(BusinessException.class, () ->
                receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", "다른 본문"))));

        assertEquals(1, listener.received().size());
        assertEquals(storedJson, payloads.findById(job.getId()).orElseThrow().getPayloadJson());
    }

    @Test
    void largeTextRoundTripsThroughTheDatabaseColumn() {
        String text = "가".repeat(100_000);

        receiver.receive(command(job, storage, manifest(job, storage, "COMPLETED", text)));

        PdfExtractionPayload stored = payloads.findById(job.getId()).orElseThrow();
        assertTrue(stored.getPayloadJson().contains(text));
        assertEquals(64, stored.getPayloadSha256().length());
    }

    @TestConfiguration
    public static class TestConfig {

        @Bean
        public PdfExtractionStorage pdfExtractionStorage() {
            return new FakePdfExtractionStorage();
        }

        @Bean
        public ObjectMapper objectMapper() {
            return JsonMapper.builder().build();
        }

        @Bean
        public Clock clock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }

        @Bean
        public RecordingListener recordingListener() {
            return new RecordingListener();
        }
    }

    public static class RecordingListener {

        private final List<PdfExtractionCompletedEvent> received = new ArrayList<>();
        private boolean failNext;

        @EventListener
        public void on(PdfExtractionCompletedEvent event) {
            if (failNext) {
                failNext = false;
                throw new IllegalStateException("review failed");
            }
            received.add(event);
        }

        public void failNext() {
            failNext = true;
        }

        public List<PdfExtractionCompletedEvent> received() {
            return received;
        }

        public void reset() {
            received.clear();
            failNext = false;
        }
    }
}
