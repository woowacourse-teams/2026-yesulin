package art.yesulin.timetable.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.timetable.application.ProducerTimetableService;
import art.yesulin.timetable.application.ProducerTimetableService.Assignment;
import art.yesulin.timetable.application.ProducerTimetableService.Contact;
import art.yesulin.timetable.application.ProducerTimetableService.ContactEdit;
import art.yesulin.timetable.application.ProducerTimetableService.Detail;
import art.yesulin.timetable.application.ProducerTimetableService.Summary;
import art.yesulin.timetable.domain.setting.TimeSlot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/producer-timetables")
@LoginRequired
@RequiredArgsConstructor
public class ProducerTimetableController {

    private final ProducerTimetableService service;

    @GetMapping
    public ResponseEntity<List<Summary>> list(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal) {
        return response(service.list(principal.memberId()));
    }

    @PostMapping
    public ResponseEntity<Detail> create(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody Create request) {
        return response(service.create(principal.memberId(), request.creationKey().toString(), request.title()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Detail> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long id) {
        return response(service.find(principal.memberId(), id));
    }

    @PostMapping("/{id}/imports")
    public ResponseEntity<Detail> importPassed(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long id, @Valid @RequestBody Import request) {
        return response(service.importPassed(principal.memberId(), id, request.reviewId().toString(),
                request.actors().stream().map(item -> new Contact(item.entryId().toString(),
                        item.name(), item.phone(), item.email())).toList()));
    }

    @PatchMapping("/{id}/actors/{actorId}")
    public ResponseEntity<Detail> updateContact(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long id, @PathVariable long actorId, @Valid @RequestBody Edit request) {
        return response(service.updateContact(principal.memberId(), id, actorId,
                new ContactEdit(request.name(), request.phone(), request.email(), request.previousName(),
                        request.previousPhone(), request.previousEmail())));
    }

    @PatchMapping("/{id}/assignments")
    public ResponseEntity<Detail> assign(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long id, @Valid @RequestBody Assign request) {
        return response(service.assign(principal.memberId(), id, request.assignments().stream()
                .map(item -> new Assignment(item.actorId(), slot(item.slot()), slot(item.previousSlot()))).toList()));
    }

    private TimeSlot slot(Slot slot) {
        return slot == null ? null : new TimeSlot(slot.date(), slot.startTime());
    }

    private <T> ResponseEntity<T> response(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    @DeleteMapping("/{id}/actors/{actorId}")
    public ResponseEntity<Detail> remove(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long id, @PathVariable long actorId) {
        return response(service.remove(principal.memberId(), id, actorId));
    }

    public record Assign(@NotEmpty @Size(max = 300) List<@NotNull @Valid AssignmentInput> assignments) {
    }
    public record AssignmentInput(@NotNull Long actorId, @Valid Slot slot, @Valid Slot previousSlot) {
    }
    public record Slot(@NotNull LocalDate date, @NotNull LocalTime startTime) {
    }
    public record Create(@NotNull UUID creationKey, @NotBlank @Size(max = 60) String title) {
    }
    public record Import(@NotNull UUID reviewId,
                         @NotEmpty @Size(max = 300) List<@NotNull @Valid ImportedContact> actors) {
    }
    public record ImportedContact(@NotNull UUID entryId, @NotBlank @Size(max = 30) String name,
                                  @Size(max = 13) String phone, @Email @Size(max = 254) String email) {
    }
    public record Edit(@NotBlank @Size(max = 30) String name, @Size(max = 13) String phone,
                       @Email @Size(max = 254) String email,
                       @NotNull @Size(max = 30) String previousName, @Size(max = 13) String previousPhone,
                       @NotNull @Size(max = 254) String previousEmail) {
    }
}
