package art.yesulin.timetable.presentation.api;

import static art.yesulin.timetable.presentation.api.TimetableRequests.KEY_HEADER;

import art.yesulin.timetable.application.ActorTimetableResult;
import art.yesulin.timetable.application.ActorTimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 배우가 문자로 받은 개인 링크로 쓰는 API다. 개인 링크 열쇠도 헤더로만 받는다. */
@RestController
@RequestMapping("/api/v1/timetables/actor")
@RequiredArgsConstructor
public class ActorTimetableController {

    private final ActorTimetableService actorTimetableService;

    @GetMapping
    public ResponseEntity<ActorTimetableResult> find(@RequestHeader(KEY_HEADER) String accessKey) {
        return ok(actorTimetableService.find(accessKey));
    }

    @PutMapping("/slot")
    public ResponseEntity<ActorTimetableResult> changeSlot(
            @RequestHeader(KEY_HEADER) String accessKey,
            @Valid @RequestBody ChangeActorSlotRequest request
    ) {
        return ok(actorTimetableService.changeSlot(
                accessKey, TimeSlotRequest.toSlot(request.current()), TimeSlotRequest.toSlot(request.next())
        ));
    }

    @PostMapping("/requests")
    public ResponseEntity<ActorTimetableResult> requestTime(
            @RequestHeader(KEY_HEADER) String accessKey,
            @Valid @RequestBody CreateTimeRequestRequest request
    ) {
        return ok(actorTimetableService.requestTime(accessKey, request.message()));
    }

    private ResponseEntity<ActorTimetableResult> ok(ActorTimetableResult result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);
    }
}
