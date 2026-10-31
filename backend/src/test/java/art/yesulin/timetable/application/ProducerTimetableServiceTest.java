package art.yesulin.timetable.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.infrastructure.persistence.QueryDslConfiguration;
import art.yesulin.timetable.application.ProducerTimetableService.Assignment;
import art.yesulin.timetable.application.ProducerTimetableService.Contact;
import art.yesulin.timetable.application.ProducerTimetableService.ContactEdit;
import art.yesulin.timetable.domain.TimetableRepository;
import art.yesulin.timetable.domain.actor.TimetableActorRepository;
import art.yesulin.timetable.domain.setting.TimeSlot;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest(showSql = false, properties = {
        "spring.datasource.url=jdbc:h2:mem:producer-rosters;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ProducerTimetableService.class, QueryDslConfiguration.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ProducerTimetableServiceTest {

    @Autowired private ProducerTimetableService service;
    @Autowired private MemberRepository members;
    @Autowired private AuditRepository reviews;
    @Autowired private AuditApplicantRepository applicants;
    @Autowired private TimetableRepository timetables;
    @Autowired private TimetableActorRepository actors;
    private long owner;
    private long other;
    private Audit review;

    @BeforeEach
    void prepare() {
        owner = member();
        other = member();
        review = reviews.save(new Audit(owner, "test review", List.of(), Instant.now()));
    }

    @Test
    void createsUnplannedPrivateDraftWithoutManagementKey() {
        String key = UUID.randomUUID().toString();
        var first = service.create(owner, key, "first");
        assertEquals(first.id(), service.create(owner, key, "retry").id());
        var timetable = timetables.findById(first.id()).orElseThrow();
        assertNull(timetable.getManageKey());
        assertTrue(timetable.isOwned());
        assertTrue(timetable.slots().isEmpty());
        assertThrows(BusinessException.class, () -> service.find(other, first.id()));
        assertTrue(service.list(other).isEmpty());
    }

    @Test
    void importsWithoutContactsAndPreservesSourceAndManualEditsOnRetry() {
        var entry = entry(AuditDecision.PASS);
        long id = draft();
        var contact = new Contact(entry.getId(), "name", "", "");
        var first = service.importPassed(owner, id, review.getId(), List.of(contact));
        var actor = first.actors().getFirst();
        assertNull(actor.phone());
        var changed = service.updateContact(owner, id, actor.id(), new ContactEdit("edited", "010-0000-0001",
                "actor@example.test", actor.name(), actor.phone(), actor.email()));
        assertEquals("edited", changed.actors().getFirst().name());
        assertEquals("edited", service.importPassed(owner, id, review.getId(), List.of(contact))
                .actors().getFirst().name());
        assertEquals("keep memo", applicants.findById(entry.getId()).orElseThrow().getMemo());
        assertEquals(AuditDecision.PASS, applicants.findById(entry.getId()).orElseThrow().getDecision());
        assertEquals(1, service.importPassed(owner, draft(), review.getId(), List.of(contact)).actors().size());
        assertThrows(BusinessException.class, () -> service.updateContact(owner, id, actor.id(),
                new ContactEdit("stale", "", "", actor.name(), actor.phone(), actor.email())));
    }

    @Test
    void rejectsOtherOwnersOtherSourcesAndNonPassedWithoutPartialInsert() {
        long id = draft();
        var passed = entry(AuditDecision.PASS);
        var failed = entry(AuditDecision.FAIL);
        var valid = new Contact(passed.getId(), "one", "", "");
        assertThrows(BusinessException.class, () -> service.importPassed(other, id, review.getId(), List.of(valid)));
        long otherDraft = service.create(other, UUID.randomUUID().toString(), "other").id();
        assertThrows(BusinessException.class, () -> service.importPassed(other, otherDraft,
                review.getId(), List.of(valid)));
        assertThrows(BusinessException.class, () -> service.importPassed(owner, id, review.getId(),
                List.of(valid, new Contact(failed.getId(), "two", "", ""))));
        assertTrue(service.find(owner, id).actors().isEmpty());
    }

    @Test
    void rejectsDuplicatePhonesAndInvalidContactsButAllowsManyMissingPhones() {
        long id = draft();
        var one = entry(AuditDecision.PASS);
        var two = entry(AuditDecision.PASS);
        assertThrows(BusinessException.class, () -> service.importPassed(owner, id, review.getId(), List.of(
                new Contact(one.getId(), "one", "010-0000-0001", ""),
                new Contact(two.getId(), "two", "010-0000-0001", ""))));
        assertThrows(BusinessException.class, () -> service.importPassed(owner, id, review.getId(),
                List.of(new Contact(one.getId(), "one", "bad", ""))));
        assertThrows(BusinessException.class, () -> service.importPassed(owner, id, review.getId(),
                List.of(new Contact(one.getId(), "one", "", "bad"))));
        assertEquals(2, service.importPassed(owner, id, review.getId(), List.of(
                new Contact(one.getId(), "one", null, ""), new Contact(two.getId(), "two", "", null)))
                .actors().size());
    }

    @Test
    void enforcesThreeHundredLimitAfterSkippingAlreadyImportedSources() {
        long id = draft();
        var batch = IntStream.range(0, 300).mapToObj(i -> new Contact(entry(AuditDecision.PASS).getId(),
                "name " + i, "", "")).toList();
        assertEquals(300, service.importPassed(owner, id, review.getId(), batch).actors().size());
        assertEquals(300, service.importPassed(owner, id, review.getId(), batch).actors().size());
        var extra = new Contact(entry(AuditDecision.PASS).getId(), "extra", "", "");
        assertThrows(BusinessException.class, () -> service.importPassed(owner, id, review.getId(), List.of(extra)));
        assertEquals(300, actors.countByTimetableId(id));
    }

    @Test
    void concurrentCreateAndImportAreIdempotent() throws Exception {
        String key = UUID.randomUUID().toString();
        var ids = concurrently(() -> service.create(owner, key, "concurrent").id());
        assertEquals(ids.getFirst(), ids.getLast());
        var contact = new Contact(entry(AuditDecision.PASS).getId(), "one", "", "");
        concurrently(() -> service.importPassed(owner, ids.getFirst(), review.getId(), List.of(contact)).id());
        assertEquals(1, actors.countByTimetableId(ids.getFirst()));
    }

    @Test
    void removalChecksOwnershipAndMembershipAndPreservesSourceForReimport() {
        long id = draft();
        var entry = entry(AuditDecision.PASS);
        var contact = new Contact(entry.getId(), "name", "", "");
        long actorId = service.importPassed(owner, id, review.getId(), List.of(contact)).actors().getFirst().id();
        assertThrows(BusinessException.class, () -> service.remove(other, id, actorId));
        long anotherId = draft();
        assertThrows(BusinessException.class, () -> service.remove(owner, anotherId, actorId));
        assertEquals(1, service.find(owner, id).actors().size());
        assertTrue(service.remove(owner, id, actorId).actors().isEmpty());
        assertEquals(AuditDecision.PASS, applicants.findById(entry.getId()).orElseThrow().getDecision());
        assertEquals("keep memo", applicants.findById(entry.getId()).orElseThrow().getMemo());
        assertEquals(1, service.importPassed(owner, id, review.getId(), List.of(contact)).actors().size());
    }

    @Test
    void freelyAssignsSameTimeThenReschedulesAndClearsWithoutInviting() {
        long id = draft();
        var source = entry(AuditDecision.PASS);
        var first = service.importPassed(owner, id, review.getId(), List.of(
                new Contact(source.getId(), "one", "", ""),
                new Contact(entry(AuditDecision.PASS).getId(), "two", "", "")));
        var time = new TimeSlot(LocalDate.of(2026, 11, 3), LocalTime.of(14, 7));
        var changes = first.actors().stream().map(actor -> new Assignment(actor.id(), time, null)).toList();
        assertTrue(service.assign(owner, id, changes).actors().stream().allMatch(actor -> time.equals(actor.slot())));
        assertEquals(2, service.assign(owner, id, changes).actors().size());
        long actorId = first.actors().getFirst().id();
        var later = new TimeSlot(LocalDate.of(2026, 11, 4), LocalTime.of(10, 13));
        service.assign(owner, id, List.of(new Assignment(actorId, later, time)));
        assertEquals(later, service.find(owner, id).actors().getFirst().slot());
        service.assign(owner, id, List.of(new Assignment(actorId, null, later)));
        assertNull(service.find(owner, id).actors().getFirst().slot());
        assertNull(actors.findById(actorId).orElseThrow().getInvitedAt());
        assertEquals("keep memo", applicants.findById(source.getId()).orElseThrow().getMemo());
        assertNull(service.find(owner, id).actors().getFirst().phone());
    }

    @Test
    void rejectsAssignmentOwnershipForeignActorsAndStaleBatchWithoutPartialUpdates() {
        long id = draft();
        var roster = service.importPassed(owner, id, review.getId(), List.of(
                new Contact(entry(AuditDecision.PASS).getId(), "one", "", ""),
                new Contact(entry(AuditDecision.PASS).getId(), "two", "", "")));
        long one = roster.actors().getFirst().id();
        long two = roster.actors().getLast().id();
        var time = new TimeSlot(LocalDate.of(2026, 11, 3), LocalTime.NOON);
        var change = new Assignment(one, time, null);
        assertThrows(BusinessException.class, () -> service.assign(other, id, List.of(change)));
        long otherId = draft();
        assertThrows(BusinessException.class, () -> service.assign(owner, otherId, List.of(change)));
        service.assign(owner, id, List.of(new Assignment(two, time, null)));
        var later = new TimeSlot(time.date().plusDays(1), LocalTime.NOON);
        assertThrows(BusinessException.class, () -> service.assign(owner, id, List.of(change,
                new Assignment(two, later, null))));
        assertNull(service.find(owner, id).actors().getFirst().slot());
        assertEquals(time, service.find(owner, id).actors().getLast().slot());
    }

    @Test
    void rejectsDuplicateTargetsAndUnsupportedPrecisionAndRetainsSlotsOnReimport() {
        long id = draft();
        var contact = new Contact(entry(AuditDecision.PASS).getId(), "one", "", "");
        long actorId = service.importPassed(owner, id, review.getId(), List.of(contact)).actors().getFirst().id();
        var time = new TimeSlot(LocalDate.of(2026, 11, 3), LocalTime.NOON);
        var change = new Assignment(actorId, time, null);
        assertThrows(BusinessException.class, () -> service.assign(owner, id, List.of(change, change)));
        assertThrows(BusinessException.class, () -> service.assign(owner, id, List.of()));
        assertThrows(BusinessException.class, () -> service.assign(owner, id, List.of(new Assignment(actorId,
                new TimeSlot(time.date(), LocalTime.of(12, 0, 1)), null))));
        assertThrows(BusinessException.class, () -> service.assign(owner, id, List.of(new Assignment(actorId,
                new TimeSlot(LocalDate.of(999, 1, 1), LocalTime.NOON), null))));
        service.assign(owner, id, List.of(change));
        assertEquals(time, service.importPassed(owner, id, review.getId(), List.of(contact))
                .actors().getFirst().slot());
    }

    private <T> List<T> concurrently(Callable<T> work) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            Callable<T> waiting = () -> {
                start.await();
                return work.call();
            };
            var first = executor.submit(waiting);
            var second = executor.submit(waiting);
            start.countDown();
            return List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
        }
    }

    private long member() {
        return members.save(new Member(UUID.randomUUID() + "@example.test", "password",
                MemberType.PRODUCER, MemberStatus.ACTIVE)).getId();
    }

    private long draft() {
        return service.create(owner, UUID.randomUUID().toString(), "draft").id();
    }

    private AuditApplicant entry(AuditDecision decision) {
        var entry = new AuditApplicant(review.getId(), UUID.randomUUID().toString(), "synthetic.pdf");
        entry.review("keep memo", decision);
        return applicants.save(entry);
    }
}
