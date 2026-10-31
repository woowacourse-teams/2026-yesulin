package art.yesulin.timetable.application;

import static art.yesulin.timetable.domain.TimetableErrorCode.ASSIGNMENT_CONFLICT;
import static art.yesulin.timetable.domain.TimetableErrorCode.DUPLICATE_ACTOR;
import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;
import static art.yesulin.timetable.domain.TimetableErrorCode.NOT_FOUND;
import static art.yesulin.timetable.domain.TimetableErrorCode.TOO_MANY_ACTORS;

import art.yesulin.audit.domain.Audit;
import art.yesulin.audit.domain.AuditApplicant;
import art.yesulin.audit.domain.AuditApplicantRepository;
import art.yesulin.audit.domain.AuditDecision;
import art.yesulin.audit.domain.AuditRepository;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.Timetable;
import art.yesulin.timetable.domain.TimetableRepository;
import art.yesulin.timetable.domain.actor.TimetableActor;
import art.yesulin.timetable.domain.actor.TimetableActorRepository;
import art.yesulin.timetable.domain.setting.TimeSlot;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** 공연사 계정으로 명단을 준비한다. 명단과 자유 시간 배정을 관리하며 확정·메시지는 만들지 않는다. */
@Service
@RequiredArgsConstructor
public class ProducerTimetableService {

    private final TimetableRepository timetables;
    private final TimetableActorRepository actors;
    private final MemberRepository members;
    private final AuditRepository reviews;
    private final AuditApplicantRepository applicants;

    @Transactional(readOnly = true)
    public List<Summary> list(long ownerId) {
        return timetables.findByOwnerIdOrderByIdDesc(ownerId).stream()
                .map(item -> new Summary(item.getId(), item.getProfile().getTitle(),
                        actors.countByTimetableId(item.getId()))).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail create(long ownerId, String creationKey, String title) {
        members.findForUpdate(ownerId).orElseThrow(this::notFound);
        Timetable timetable = timetables.findByOwnerIdAndCreationKey(ownerId, creationKey)
                .orElseGet(() -> timetables.save(Timetable.ownedDraft(ownerId, creationKey, title)));
        return detail(timetable);
    }

    @Transactional(readOnly = true)
    public Detail find(long ownerId, long timetableId) {
        return detail(timetables.findByIdAndOwnerId(timetableId, ownerId).orElseThrow(this::notFound));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail importPassed(long ownerId, long timetableId, String reviewId, List<Contact> contacts) {
        final Timetable timetable = lockDraft(ownerId, timetableId);
        Audit review = reviews.findByIdAndOwnerId(reviewId, ownerId).orElseThrow(this::notFound);
        if (contacts == null || contacts.isEmpty() || contacts.size() > TimetableService.MAX_ACTORS
                || contacts.stream().anyMatch(item -> item == null || item.entryId() == null)
                || contacts.stream().map(Contact::entryId).distinct().count() != contacts.size()) {
            throw new BusinessException(INVALID_INPUT, "서로 다른 지원자를 1~300명 선택해 주세요.");
        }
        List<TimetableActor> existing = actors.findAllByTimetableIdOrderByIdAsc(timetableId);
        var sourceIds = new HashSet<String>();
        var phones = new HashSet<String>();
        existing.forEach(actor -> {
            sourceIds.add(actor.getSourceApplicantId());
            if (actor.getPhone() != null) {
                phones.add(actor.getPhone());
            }
        });
        List<TimetableActor> added = new ArrayList<>();
        // 판정 변경과 같은 지원자 행을 잠근다. 여러 지원자 요청의 교착을 피하려고 ID 순으로 잠근다.
        for (Contact contact : contacts.stream().sorted(java.util.Comparator.comparing(Contact::entryId)).toList()) {
            AuditApplicant applicant = applicants.findInReviewForUpdate(contact.entryId(), reviewId)
                    .orElseThrow(this::notFound);
            if (sourceIds.contains(applicant.getId())) {
                continue;
            }
            if (applicant.getDecision() != AuditDecision.PASS) {
                throw new BusinessException(ASSIGNMENT_CONFLICT, "합격 상태가 변경된 지원자가 있습니다. 명단을 다시 확인해 주세요.");
            }
            String roleName = review.getRoles().stream()
                    .filter(role -> role.getId().equals(applicant.getRoleId()))
                    .map(role -> role.getName()).findFirst().orElse(review.getRoles().isEmpty() ? "자유 배역" : "미기재");
            TimetableActor actor = TimetableActor.imported(timetableId, reviewId, applicant.getId(),
                    contact.name(), contact.phone(), contact.email(), roleName);
            if (actor.getPhone() != null && !phones.add(actor.getPhone())) {
                throw new BusinessException(DUPLICATE_ACTOR, "같은 전화번호가 이미 있습니다. 명단과 연락처를 확인해 주세요.");
            }
            added.add(actor);
        }
        if (existing.size() + added.size() > TimetableService.MAX_ACTORS) {
            throw new BusinessException(TOO_MANY_ACTORS, "한 일정에는 최대 300명까지 등록할 수 있습니다.");
        }
        actors.saveAllAndFlush(added);
        return detail(timetable);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail updateContact(long ownerId, long timetableId, long actorId, ContactEdit contact) {
        final Timetable timetable = lockDraft(ownerId, timetableId);
        List<TimetableActor> roster = actors.findAllByTimetableIdOrderByIdAsc(timetableId);
        TimetableActor actor = roster.stream().filter(item -> item.getId() == actorId).findFirst()
                .orElseThrow(this::notFound);
        if (!Objects.equals(actor.getName(), contact.previousName())
                || !Objects.equals(actor.getPhone(), contact.previousPhone())
                || !Objects.equals(actor.getEmail(), contact.previousEmail())) {
            throw new BusinessException(ASSIGNMENT_CONFLICT, "다른 화면에서 연락처가 바뀌었습니다. 다시 불러와 주세요.");
        }
        actor.updateContact(contact.name(), contact.phone(), contact.email());
        if (actor.getPhone() != null && roster.stream().anyMatch(item -> item.getId() != actorId
                && actor.getPhone().equals(item.getPhone()))) {
            throw new BusinessException(DUPLICATE_ACTOR, "같은 전화번호가 이미 등록되어 있습니다.");
        }
        return detail(timetable);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail assign(long ownerId, long timetableId, List<Assignment> assignments) {
        final Timetable timetable = lockDraft(ownerId, timetableId);
        if (assignments == null || assignments.isEmpty() || assignments.size() > TimetableService.MAX_ACTORS
                || assignments.stream().anyMatch(Objects::isNull)
                || assignments.stream().map(Assignment::actorId).distinct().count() != assignments.size()) {
            throw new BusinessException(INVALID_INPUT, "서로 다른 배정 대상을 1~300명 선택해 주세요.");
        }
        var roster = actors.findAllByTimetableIdOrderByIdAsc(timetableId).stream()
                .collect(java.util.stream.Collectors.toMap(TimetableActor::getId, actor -> actor));
        for (Assignment assignment : assignments) {
            TimetableActor actor = roster.get(assignment.actorId());
            if (actor == null) {
                throw notFound();
            }
            validateSlot(assignment.slot());
            validateSlot(assignment.previousSlot());
            // 응답 유실 뒤 같은 값을 재전송해도 성공한다. 다른 값으로 바뀌었으면 덮어쓰지 않는다.
            if (Objects.equals(actor.getSlot(), assignment.slot())) {
                continue;
            }
            if (!Objects.equals(actor.getSlot(), assignment.previousSlot())) {
                throw new BusinessException(ASSIGNMENT_CONFLICT, "다른 화면에서 배정이 바뀌었습니다. 다시 불러와 주세요.");
            }
            actor.assign(assignment.slot());
        }
        return detail(timetable);
    }

    private void validateSlot(TimeSlot slot) {
        if (slot != null && (slot.date().getYear() < 1000 || slot.date().getYear() > 9999
                || slot.startTime().getSecond() != 0 || slot.startTime().getNano() != 0)) {
            throw new BusinessException(INVALID_INPUT, "날짜와 분 단위 시각을 확인해 주세요.");
        }
    }

    private Timetable lockDraft(long ownerId, long timetableId) {
        Timetable timetable = timetables.findOwnedForUpdate(timetableId, ownerId).orElseThrow(this::notFound);
        if (timetable.isPublished()) {
            throw new BusinessException(INVALID_INPUT, "명단 준비 중인 일정에서만 변경할 수 있습니다.");
        }
        return timetable;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Detail remove(long ownerId, long timetableId, long actorId) {
        final Timetable timetable = lockDraft(ownerId, timetableId);
        TimetableActor actor = actors.findAllByTimetableIdOrderByIdAsc(timetableId).stream()
                .filter(item -> item.getId() == actorId).findFirst().orElseThrow(this::notFound);
        actors.delete(actor);
        actors.flush();
        return detail(timetable);
    }

    private Detail detail(Timetable timetable) {
        List<TimetableActor> roster = actors.findAllByTimetableIdOrderByIdAsc(timetable.getId());
        var sources = applicants.findAllById(roster.stream().map(TimetableActor::getSourceApplicantId)
                .filter(Objects::nonNull).toList()).stream()
                .collect(java.util.stream.Collectors.toMap(AuditApplicant::getId, item -> item));
        return new Detail(timetable.getId(), timetable.getProfile().getTitle(), roster.stream().map(actor -> {
            AuditApplicant source = sources.get(actor.getSourceApplicantId());
            return new Actor(actor.getId(), actor.getName(), actor.getPhone(), actor.getEmail(),
                    actor.getRoleName(), actor.getSourceReviewId(), actor.getSourceApplicantId(),
                    source == null ? null : source.getDecision(), actor.getSlot());
        }).toList());
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "일정 또는 지원자를 찾을 수 없습니다.");
    }

    public record Contact(String entryId, String name, String phone, String email) {
    }
    public record ContactEdit(String name, String phone, String email,
                              String previousName, String previousPhone, String previousEmail) {
    }
    public record Assignment(long actorId, TimeSlot slot, TimeSlot previousSlot) {
    }
    public record Summary(long id, String title, long actorCount) {
    }
    public record Detail(long id, String title, List<Actor> actors) {
    }
    public record Actor(long id, String name, String phone, String email, String roleName,
                        String sourceReviewId, String sourceApplicantId, AuditDecision sourceDecision, TimeSlot slot) {
    }
}
