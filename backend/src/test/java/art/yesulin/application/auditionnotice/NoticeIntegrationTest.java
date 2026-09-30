package art.yesulin.application.auditionnotice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.role.AuditionRoleSectionRepository;
import art.yesulin.domain.audition.schedule.AuditionScheduleRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.domain.otraudition.OtrScreeningReview;
import art.yesulin.domain.otraudition.OtrScreeningReviewRepository;
import art.yesulin.domain.otraudition.OtrSubmission;
import art.yesulin.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.screening.ScreeningReview;
import art.yesulin.domain.screening.ScreeningReviewRepository;
import art.yesulin.domain.screening.ScreeningReviewStatus;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionGender;
import art.yesulin.domain.submission.SubmissionRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ScreeningTestFixture;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:sms-integration;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false", "yesulin.sms.enabled=true", "yesulin.sms.sender=0212345678",
        "yesulin.sms.sms-price=10", "yesulin.sms.lms-price=30", "yesulin.sms.daily-limit=1000",
        "yesulin.sms.request-limit=500", "yesulin.sms.worker-enabled=false"
})
@Sql(scripts = {"/db/migration/V20260929170000__create_audition_sms_notices.sql",
        "/db/migration/V20260929180000__scope_audition_sms_notices.sql"},
        executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class NoticeIntegrationTest {

    @Autowired
    private NoticeService service;
    @Autowired
    private NoticeWorker worker;
    @Autowired
    private NoticeStore store;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private MemberRepository members;
    @Autowired
    private ProducerRepository producers;
    @Autowired
    private PerformanceRepository performances;
    @Autowired
    private AuditionRepository auditions;
    @Autowired
    private AuditionRoleSectionRepository roles;
    @Autowired
    private AuditionScheduleRepository schedules;
    @Autowired
    private SubmissionRepository submissions;
    @Autowired
    private FileAssetRepository files;
    @Autowired
    private ScreeningReviewRepository reviews;
    @Autowired
    private OtrAuditionRepository otrAuditions;
    @Autowired
    private OtrSubmissionRepository otrSubmissions;
    @Autowired
    private OtrScreeningReviewRepository otrReviews;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper mapper;
    @MockitoBean
    private SmsGateway gateway;

    private long ownerId;
    private long roleId;
    private NoticeScope standardScope;
    private ScreeningReview review;
    private NoticeCommand command;

    @BeforeEach
    void setUp() {
        jdbc.update("DELETE FROM audition_sms_deliveries");
        jdbc.update("DELETE FROM audition_sms_batches");
        jdbc.update("DELETE FROM audition_sms_drafts");
        jdbc.update("DELETE FROM audition_sms_daily_usage");
        ownerId = members.saveAndFlush(new Member(UUID.randomUUID() + "@example.com", "test",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
        producers.saveAndFlush(new Producer(ownerId, "테스트 공연사", "01099998888"));
        ScreeningTestFixture.Fixture fixture = new ScreeningTestFixture(performances, auditions, roles, schedules,
                submissions, files).save(ownerId, UUID.randomUUID(), 2);
        roleId = fixture.roleId();
        standardScope = NoticeScope.standard(roleId);
        Long first = new TransactionTemplate(transactionManager).execute(s -> schedules
                .findByAuditionId(fixture.auditionId()).orElseThrow().getStages().getFirst().getId());
        review = new ScreeningReview(fixture.submissionId(), roleId, first);
        review.decide(ScreeningReviewStatus.PASS, null);
        review = reviews.saveAndFlush(review);
        command = new NoticeCommand(service.metadata(ownerId, standardScope, 1).targetStageId(),
                "{이름}님 오디션 일시: {오디션일시}", List.of(new NoticeCommand.Recipient(fixture.submissionId(),
                LocalDateTime.now(ZoneId.of("Asia/Seoul")).plusDays(2).withSecond(0).withNano(0))));
        when(gateway.send(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new SmsGateway.Outcome("ACCEPTED", "123", null));
    }

    @Test
    void usesActualApiThenFakeGatewayAndPreservesReview() throws Exception {
        String base = "/api/v1/audition-roles/" + roleId + "/screening-rounds/1";
        MemberPrincipal principal = new MemberPrincipal(ownerId, MemberType.PRODUCER, MemberStatus.ACTIVE);
        String previewJson = mvc.perform(post(base + "/sms-previews").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(command)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        NoticeService.Preview preview = mapper.readValue(previewJson, NoticeService.Preview.class);
        String token = preview.token();
        String batchJson = mvc.perform(post(base + "/sms-batches").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", UUID.randomUUID())
                        .content(mapper.writeValueAsString(new SendBody(command, token))))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(mapper.readTree(batchJson).path("id").asText());
        worker.tick();
        NoticeStore.Delivery d = service.detail(ownerId, standardScope, 1, id).deliveries().getFirst();
        assertEquals("ACCEPTED", d.status());
        assertTrue(d.body().contains("김하린"));
        assertTrue(d.body().contains(command.recipients().getFirst().appointment().toLocalDate().toString()));
        assertEquals(ScreeningReviewStatus.PASS, reviews.findById(review.getId()).orElseThrow().getStatus());
        mvc.perform(get(base + "/sms-batches/" + id).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal))
                .andExpect(status().isOk());
    }

    @Test
    void historySummarizesThreeBatchesAndKeepsTheirDetailsIndependent() throws Exception {
        List<UUID> ids = new java.util.ArrayList<>();
        for (int i = 0; i < 3; i++) {
            ids.add(service.send(ownerId, standardScope, 1, UUID.randomUUID(), command,
                    service.preview(ownerId, standardScope, 1, command).token()).id());
        }
        String[] states = {"DELIVERED", "FAILED", "ACCEPTED"};
        for (int i = 0; i < ids.size(); i++) {
            jdbc.update("UPDATE audition_sms_deliveries SET status=? WHERE batch_id=?",
                    states[i], ids.get(i).toString());
        }
        List<NoticeStore.HistoryItem> history = service.history(ownerId, standardScope, 1);
        assertEquals(3, history.size());
        assertEquals(1, history.stream().mapToInt(NoticeStore.HistoryItem::deliveredCount).sum());
        assertEquals(1, history.stream().mapToInt(NoticeStore.HistoryItem::failedCount).sum());
        assertEquals(1, history.stream().mapToInt(NoticeStore.HistoryItem::pendingCount).sum());
        for (int i = 0; i < ids.size(); i++) {
            assertEquals(states[i], service.detail(ownerId, standardScope, 1, ids.get(i))
                    .deliveries().getFirst().status());
        }
        String base = "/api/v1/audition-roles/" + roleId + "/screening-rounds/1/sms-batches";
        MemberPrincipal principal = new MemberPrincipal(ownerId, MemberType.PRODUCER, MemberStatus.ACTIVE);
        String json = mvc.perform(get(base).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(3, mapper.readTree(json).size());
        assertEquals("김하린", mapper.readTree(json).get(0).path("firstRecipientName").asText());
        jdbc.update("DELETE FROM audition_sms_deliveries WHERE batch_id=?", ids.getFirst().toString());
        NoticeStore.HistoryItem expired = service.history(ownerId, standardScope, 1).stream()
                .filter(h -> h.batch().id().equals(ids.getFirst())).findFirst().orElseThrow();
        assertEquals(1, expired.batch().count());
        assertEquals(0, expired.retainedCount());
        assertEquals(0, expired.deliveredCount());
    }

    @Test
    void pollsRecentDeliveryEarlyAndPersistsConfirmedOutcomeWithoutResending() {
        NoticeService.Preview preview = service.preview(ownerId, standardScope, 1, command);
        NoticeStore.Batch batch = service.send(ownerId, standardScope, 1, UUID.randomUUID(), command, preview.token());
        worker.tick();
        NoticeStore.Delivery delivery = service.detail(ownerId, standardScope, 1, batch.id()).deliveries().getFirst();
        assertEquals("ACCEPTED", delivery.status());
        assertEquals(preview.recipients().getFirst().body(), delivery.body());
        assertTrue(delivery.body().startsWith(service.metadata(ownerId, standardScope, 1).messageHeader()
                .replace("{이름}", delivery.name()) + "\n\n"));
        assertTrue(delivery.body().endsWith("\n\n문의: 01099998888"));
        assertTrue(!delivery.body().contains("[테스트 공연사 /"));
        jdbc.update("UPDATE audition_sms_deliveries SET updated_at=? WHERE id=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(11)), delivery.id().toString());
        when(gateway.lookup("123", delivery.phone()))
                .thenReturn(new SmsGateway.Outcome("DELIVERED", "123", "SOLAPI_4000"));
        worker.tick();
        assertEquals("DELIVERED", service.detail(ownerId, standardScope, 1, batch.id())
                .deliveries().getFirst().status());
        verify(gateway, times(1)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void backsOffAfterSixResultChecks() {
        NoticeStore.Batch batch = service.send(ownerId, standardScope, 1, UUID.randomUUID(), command,
                service.preview(ownerId, standardScope, 1, command).token());
        worker.tick();
        jdbc.update("UPDATE audition_sms_deliveries SET lookup_count=6,updated_at=? WHERE batch_id=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(30)), batch.id().toString());
        assertTrue(store.pendingResults(java.time.Instant.now()).isEmpty());
        jdbc.update("UPDATE audition_sms_deliveries SET updated_at=? WHERE batch_id=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(901)), batch.id().toString());
        assertEquals(1, store.pendingResults(java.time.Instant.now()).size());
    }

    @Test
    void concurrentIdempotentRequestsProduceOnlyOneDelivery() throws Exception {
        String token = service.preview(ownerId, standardScope, 1, command).token();
        UUID key = UUID.randomUUID();
        try (java.util.concurrent.ExecutorService executor = Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Future<NoticeStore.Batch> first = executor.submit(
                    () -> service.send(ownerId, standardScope, 1, key, command, token));
            java.util.concurrent.Future<NoticeStore.Batch> second = executor.submit(
                    () -> service.send(ownerId, standardScope, 1, key, command, token));
            assertEquals(first.get().id(), second.get().id());
        }
        worker.tick();
        worker.tick();
        verify(gateway, times(1)).send(anyString(), anyString(), anyString(), anyString());
        assertThrows(BusinessException.class, () -> service.send(ownerId, standardScope, 1, key,
                new NoticeCommand(command.targetStageId(), command.template() + " 변경", command.recipients()), token));
    }

    @Test
    void uncertainOutcomeAndRestartNeverResend() {
        when(gateway.send(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(SmsGateway.Outcome.unknown(null));
        NoticeStore.Batch batch = enqueue();
        worker.tick();
        worker.tick();
        NoticeStore.Delivery d = store.deliveries(batch.id()).getFirst();
        assertEquals("UNKNOWN", d.status());
        verify(gateway, times(1)).send(anyString(), anyString(), anyString(), anyString());
        assertThrows(IllegalArgumentException.class,
                () -> service.retryPreview(ownerId, standardScope, 1, batch.id(), List.of(d.id())));
        jdbc.update("UPDATE audition_sms_deliveries SET status='SENDING',updated_at=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(180)));
        worker.tick();
        assertEquals("UNKNOWN", store.deliveries(batch.id()).getFirst().status());
        verify(gateway, times(1)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void failedRecipientCanRetryOnceWithPreservedSnapshot() {
        when(gateway.send(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new SmsGateway.Outcome("FAILED", null, "ALIGO_-101"));
        NoticeStore.Batch batch = enqueue();
        worker.tick();
        NoticeStore.Delivery original = store.deliveries(batch.id()).getFirst();
        List<UUID> ids = List.of(original.id());
        NoticeService.Preview preview = service.retryPreview(ownerId, standardScope, 1, batch.id(), ids);
        NoticeStore.Batch retry = service.retry(ownerId, standardScope, 1, batch.id(), UUID.randomUUID(),
                ids, preview.token());
        assertNotEquals(batch.id(), retry.id());
        assertEquals(original.body(), store.deliveries(retry.id()).getFirst().body());
        assertThrows(IllegalArgumentException.class,
                () -> service.retryPreview(ownerId, standardScope, 1, batch.id(), ids));
    }

    @Test
    void rejectsChangedReviewAndConflictingDraftsAndErasesPrivateCopies() {
        final String token = service.preview(ownerId, standardScope, 1, command).token();
        service.saveDraft(ownerId, standardScope, 1, 0, command);
        assertThrows(BusinessException.class, () -> service.saveDraft(ownerId, standardScope, 1, 0, command));
        review.decide(ScreeningReviewStatus.FAIL, null);
        reviews.saveAndFlush(review);
        assertThrows(BusinessException.class,
                () -> service.send(ownerId, standardScope, 1, UUID.randomUUID(), command, token));
        review.decide(ScreeningReviewStatus.PASS, null);
        reviews.saveAndFlush(review);
        NoticeStore.Batch batch = enqueue();
        service.saveDraft(ownerId, standardScope, 1, 0, command);
        new TransactionTemplate(transactionManager).executeWithoutResult(s ->
                store.eraseSubmission(command.recipients().getFirst().submissionId()));
        assertTrue(store.deliveries(batch.id()).isEmpty());
        assertTrue(store.draft(ownerId, standardScope, 1).isEmpty());
        worker.tick();
        verify(gateway, times(0)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void enforcesOwnershipSessionRoleAndCsrf() throws Exception {
        String base = "/api/v1/audition-roles/" + roleId + "/screening-rounds/1";
        mvc.perform(get(base + "/sms-batches")).andExpect(status().isUnauthorized());
        mvc.perform(get(base + "/sms-batches").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE,
                new MemberPrincipal(ownerId, MemberType.APPLICANT, MemberStatus.ACTIVE)))
                .andExpect(status().isForbidden());
        mvc.perform(post(base + "/sms-previews").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(command)).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE,
                                new MemberPrincipal(ownerId, MemberType.PRODUCER, MemberStatus.ACTIVE)))
                .andExpect(status().isForbidden());
        assertThrows(BusinessException.class, () -> service.history(ownerId + 100000, standardScope, 1));
    }

    private NoticeStore.Batch enqueue() {
        return service.send(ownerId, standardScope, 1, UUID.randomUUID(), command,
                service.preview(ownerId, standardScope, 1, command).token());
    }

    @Test
    void expiresPersonalInformationButKeepsIdempotentReceipt() {
        final NoticeStore.Batch batch = enqueue();
        service.saveDraft(ownerId, standardScope, 1, 0, command);
        java.sql.Timestamp old = java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(31L * 86400));
        jdbc.update("UPDATE audition_sms_deliveries SET created_at=?", old);
        jdbc.update("UPDATE audition_sms_drafts SET updated_at=?", old);
        worker.tick();
        assertTrue(store.deliveries(batch.id()).isEmpty());
        assertTrue(store.draft(ownerId, standardScope, 1).isEmpty());
        assertTrue(store.byKey(ownerId, batch.idempotencyKey()).isPresent());
        verify(gateway, times(0)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void replacesExpiredDraftBeforeCleanupWorkerRuns() {
        service.saveDraft(ownerId, standardScope, 1, 0, command);
        jdbc.update("UPDATE audition_sms_drafts SET updated_at=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(31L * 86400)));
        assertEquals(0, service.draft(ownerId, standardScope, 1).version());
        assertEquals(1, service.saveDraft(ownerId, standardScope, 1, 0, command).version());
    }

    @Test
    void blocksDailyQuotaWithoutInsertingAnotherBatch() {
        final NoticeStore.Batch batch = enqueue();
        jdbc.update("UPDATE audition_sms_daily_usage SET reserved_count=1000");
        assertThrows(BusinessException.class, this::enqueue);
        assertEquals(1, store.batches(ownerId, standardScope, 1).size());
        assertEquals(batch.id(), store.batches(ownerId, standardScope, 1).getFirst().id());
    }

    @Test
    void permitsClosedSourceRoundButDoesNotTreatNextRoundPendingAsPassed() {
        jdbc.update("""
                INSERT INTO screening_completions (audition_role_id,screening_stage_id,completed_at) VALUES (?,?,?)
                """,
                roleId, review.getScreeningStageId(), java.sql.Timestamp.from(java.time.Instant.now()));
        assertTrue(service.preview(ownerId, standardScope, 1, command).sendable());
        NoticeCommand last = new NoticeCommand(null, command.template(), command.recipients());
        assertTrue(service.preview(ownerId, standardScope, 2, last).recipients().getFirst().error() != null);
    }

    @Test
    void otrEmptyHistoryIsSuccessfulAndInvalidScopeIsNotAnEmptyHistory() throws Exception {
        OtrFixture fixture = otrFixture();
        MemberPrincipal principal = new MemberPrincipal(ownerId, MemberType.PRODUCER, MemberStatus.ACTIVE);
        String json = mvc.perform(get(fixture.base() + "/sms-batches")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals("[]", json);
        assertTrue(service.metadata(ownerId, fixture.scope(), 1).messageHeader().contains("OTR 테스트 공고"));
        assertThrows(BusinessException.class, () -> service.history(ownerId + 100000, fixture.scope(), 1));
        assertThrows(BusinessException.class,
                () -> service.history(ownerId, new NoticeScope(3, fixture.scope().otrAuditionId()), 1));
        assertThrows(BusinessException.class, () -> service.history(ownerId, fixture.scope(), 2));
        mvc.perform(get(fixture.base() + "/sms-batches")).andExpect(status().isUnauthorized());
        mvc.perform(get(fixture.base() + "/sms-batches").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE,
                        new MemberPrincipal(ownerId, MemberType.APPLICANT, MemberStatus.ACTIVE)))
                .andExpect(status().isForbidden());
        mvc.perform(get(fixture.base() + "/sms-batches").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE,
                        new MemberPrincipal(ownerId + 100000, MemberType.PRODUCER, MemberStatus.ACTIVE)))
                .andExpect(status().isNotFound());
        mvc.perform(post(fixture.base() + "/sms-batches")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .header("Idempotency-Key", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(new SendBody(fixture.command(), "token"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void otrHttpSendUsesSharedWorkerAndReportsDeliveredRecipients() throws Exception {
        OtrFixture fixture = otrFixture();
        MemberPrincipal principal = new MemberPrincipal(ownerId, MemberType.PRODUCER, MemberStatus.ACTIVE);
        String previewJson = mvc.perform(post(fixture.base() + "/sms-previews").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(fixture.command())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        NoticeService.Preview preview = mapper.readValue(previewJson, NoticeService.Preview.class);
        String token = preview.token();
        String body = mapper.writeValueAsString(new SendBody(fixture.command(), token));
        UUID key = UUID.randomUUID();
        String batchJson = mvc.perform(post(fixture.base() + "/sms-batches").with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .header("Idempotency-Key", key).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        UUID batchId = UUID.fromString(mapper.readTree(batchJson).path("id").asText());
        assertEquals(batchId, service.send(ownerId, fixture.scope(), 1, key, fixture.command(), token).id());
        assertEquals(null, store.batch(batchId).orElseThrow().sourceStageId());
        worker.tick();
        NoticeService.Detail detail = service.detail(ownerId, fixture.scope(), 1, batchId);
        assertEquals(2, detail.deliveries().size());
        for (NoticeStore.Delivery delivery : detail.deliveries()) {
            assertEquals("ACCEPTED", delivery.status());
            NoticeService.PreviewRecipient recipient = preview.recipients().stream()
                    .filter(item -> item.submissionId().equals(delivery.submissionId())).findFirst().orElseThrow();
            assertEquals(recipient.body(), delivery.body());
            assertEquals(recipient.type(), delivery.type());
            verify(gateway).send(anyString(), eq(delivery.phone()), eq(recipient.body()), eq(recipient.type()));
            assertTrue(delivery.body().startsWith("안녕하세요, 테스트 공연사입니다.\n"));
            assertTrue(delivery.body().contains(delivery.name()
                    + "님께서 'OTR 테스트 공고' 오디션 대상자로 선정되셨습니다."));
            assertTrue(delivery.body().contains(delivery.name()));
            assertTrue(delivery.body().contains(delivery.appointment().toString().replace('T', ' ')));
            assertTrue(delivery.body().endsWith("문의: 01099998888"));
        }
        when(gateway.lookup(anyString(), anyString()))
                .thenReturn(new SmsGateway.Outcome("DELIVERED", "123", "SOLAPI_4000"));
        jdbc.update("UPDATE audition_sms_deliveries SET updated_at=? WHERE batch_id=?",
                java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(11)), batchId.toString());
        worker.tick();
        assertEquals(2, service.history(ownerId, fixture.scope(), 1).getFirst().deliveredCount());
        mvc.perform(get(fixture.base() + "/sms-batches/" + batchId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)).andExpect(status().isOk());
        verify(gateway, times(2)).send(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void isolatesStandardAndTwoOtrAuditionsWithSameRoleOrderIncludingDraftAndRetry() {
        OtrFixture first = otrFixture();
        OtrFixture second = otrFixture();
        final NoticeStore.Batch standard = enqueue();
        when(gateway.send(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(new SmsGateway.Outcome("FAILED", null, "TEST_FAILURE"));
        NoticeService.Preview preview = service.preview(ownerId, first.scope(), 1, first.command());
        NoticeStore.Batch batch = service.send(ownerId, first.scope(), 1, UUID.randomUUID(),
                first.command(), preview.token());
        assertTrue(service.history(ownerId, second.scope(), 1).isEmpty());
        assertEquals(1, service.history(ownerId, standardScope, 1).size());
        assertThrows(BusinessException.class, () -> service.detail(ownerId, second.scope(), 1, batch.id()));
        assertThrows(BusinessException.class,
                () -> service.detail(ownerId, standardScope, 1, batch.id()));
        assertThrows(BusinessException.class, () -> service.detail(ownerId, first.scope(), 1, standard.id()));
        assertThrows(BusinessException.class, () -> service.send(ownerId, second.scope(), 1,
                batch.idempotencyKey(), first.command(), preview.token()));
        service.saveDraft(ownerId, first.scope(), 1, 0, first.command());
        assertEquals(0, service.draft(ownerId, second.scope(), 1).version());
        worker.tick();
        List<UUID> deliveryIds = store.deliveries(batch.id()).stream().map(NoticeStore.Delivery::id).toList();
        assertThrows(BusinessException.class,
                () -> service.retryPreview(ownerId, second.scope(), 1, batch.id(), deliveryIds));
        NoticeService.Preview retry = service.retryPreview(ownerId, first.scope(), 1, batch.id(), deliveryIds);
        NoticeStore.Batch retried = service.retry(ownerId, first.scope(), 1, batch.id(), UUID.randomUUID(),
                deliveryIds, retry.token());
        assertEquals(first.scope().key(), retried.scopeKey());
        assertEquals(batch.id(), retried.retryOf());
    }

    @Test
    void otrRejectsNonPassedAndRechecksPassBeforeCallingProvider() {
        OtrFixture fixture = otrFixture();
        NoticeService.Preview preview = service.preview(ownerId, fixture.scope(), 1, fixture.command());
        final NoticeStore.Batch batch = service.send(ownerId, fixture.scope(), 1, UUID.randomUUID(),
                fixture.command(), preview.token());
        for (OtrScreeningReview item : otrReviews.findAllByOtrAuditionIdAndRoleOrder(fixture.auditionId(), 1)) {
            item.update(ScreeningReviewStatus.FAIL, null, null);
            otrReviews.saveAndFlush(item);
        }
        assertTrue(!service.preview(ownerId, fixture.scope(), 1, fixture.command()).sendable());
        assertThrows(BusinessException.class, () -> service.send(ownerId, fixture.scope(), 1, UUID.randomUUID(),
                fixture.command(), preview.token()));
        worker.tick();
        assertTrue(store.deliveries(batch.id()).stream()
                .allMatch(d -> "ELIGIBILITY_CHANGED_NOT_SENT".equals(d.code())));
        verify(gateway, times(0)).send(anyString(), anyString(), anyString(), anyString());
        new TransactionTemplate(transactionManager).executeWithoutResult(s ->
                store.eraseSubmission(fixture.command().recipients().getFirst().submissionId()));
        assertEquals(1, store.deliveries(batch.id()).size());
    }

    private OtrFixture otrFixture() {
        OtrAudition audition = otrAuditions.saveAndFlush(new OtrAudition(ownerId,
                Long.toString(System.nanoTime()), "OTR 테스트 공고", List.of("주연", "조연"),
                java.time.LocalDate.now().plusDays(10)));
        List<NoticeCommand.Recipient> recipients = new java.util.ArrayList<>();
        for (int i = 0; i < 2; i++) {
            long applicant = members.saveAndFlush(new Member(UUID.randomUUID() + "@example.com", "test",
                    MemberType.APPLICANT, MemberStatus.ACTIVE)).getId();
            OtrSubmission submission = otrSubmissions.saveAndFlush(new OtrSubmission(audition.getId(), applicant,
                    "주연", new SubmissionBasicInformation("지원자" + i, 170, 60, java.time.LocalDate.of(2000, 1, 1),
                    SubmissionGender.FEMALE, "010-1234-567" + i, "actor@example.com", "서울"),
                    new SubmissionAdditionalInformation(null, List.of(), null, null, null, null, null, List.of()),
                    List.of(), List.of(), "테스트 공연사", "v1", "v1", java.time.Instant.now()));
            OtrScreeningReview passed = new OtrScreeningReview(audition.getId(), submission.getId(), 1);
            passed.update(ScreeningReviewStatus.PASS, null, null);
            otrReviews.saveAndFlush(passed);
            recipients.add(new NoticeCommand.Recipient(submission.getPublicId(),
                    command.recipients().getFirst().appointment().plusHours(i)));
        }
        return new OtrFixture(audition.getId(), new NoticeScope(1, audition.getPublicId()),
                new NoticeCommand(null, "오디션 일시: {오디션일시}\n\n자유연기 1분을 준비해주세요.", recipients));
    }

    record OtrFixture(long auditionId, NoticeScope scope, NoticeCommand command) {
        String base() {
            return "/api/v1/otr-auditions/" + scope.otrAuditionId() + "/roles/1/screening-rounds/1";
        }
    }

    record SendBody(NoticeCommand command, String previewToken) {
    }
}
