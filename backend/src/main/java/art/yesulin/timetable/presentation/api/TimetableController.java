package art.yesulin.timetable.presentation.api;

import static art.yesulin.timetable.presentation.api.TimetableRequests.KEY_HEADER;

import art.yesulin.timetable.application.TimetableBoardResult;
import art.yesulin.timetable.application.TimetableCreatedResult;
import art.yesulin.timetable.application.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 로그인 없이 관리 링크로 쓰는 기획사 일정표 API다. 관리 링크 열쇠는 요청 로그에 남지 않도록 경로 대신
 * {@code X-Timetable-Key} 헤더로 받는다. 응답에 배우 번호가 있으므로 캐시하지 않는다.
 */
@RestController
@RequestMapping("/api/v1/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @PostMapping
    public ResponseEntity<TimetableCreatedResult> create(@Valid @RequestBody CreateTimetableRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(timetableService.create(request.toCommand()));
    }

    @GetMapping("/manage")
    public ResponseEntity<TimetableBoardResult> find(@RequestHeader(KEY_HEADER) String manageKey) {
        return ok(timetableService.find(manageKey));
    }

    @PutMapping("/manage/profile")
    public ResponseEntity<TimetableBoardResult> updateProfile(
            @RequestHeader(KEY_HEADER) String manageKey,
            @Valid @RequestBody TimetableProfileRequest request
    ) {
        return ok(timetableService.updateProfile(manageKey, request.toCommand()));
    }

    @PutMapping("/manage/board")
    public ResponseEntity<TimetableBoardResult> saveBoard(
            @RequestHeader(KEY_HEADER) String manageKey,
            @Valid @RequestBody SaveTimetableBoardRequest request
    ) {
        return ok(timetableService.saveBoard(manageKey, request.toCommand()));
    }

    @PostMapping("/manage/actors")
    public ResponseEntity<TimetableBoardResult> registerActors(
            @RequestHeader(KEY_HEADER) String manageKey,
            @Valid @RequestBody RegisterActorsRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .cacheControl(CacheControl.noStore())
                .body(timetableService.registerActors(manageKey, request.toCommands()));
    }

    @DeleteMapping("/manage/actors/{actorId}")
    public ResponseEntity<TimetableBoardResult> removeActor(
            @RequestHeader(KEY_HEADER) String manageKey,
            @PathVariable long actorId
    ) {
        return ok(timetableService.removeActor(manageKey, actorId));
    }

    @PostMapping("/manage/publication")
    public ResponseEntity<TimetableBoardResult> publish(@RequestHeader(KEY_HEADER) String manageKey) {
        return ok(timetableService.publish(manageKey));
    }

    @PutMapping("/manage/self-change-lock")
    public ResponseEntity<TimetableBoardResult> changeSelfChangeLock(
            @RequestHeader(KEY_HEADER) String manageKey,
            @Valid @RequestBody ChangeSelfChangeLockRequest request
    ) {
        return ok(timetableService.changeSelfChangeLock(manageKey, request.locked()));
    }

    @PostMapping("/manage/requests/{requestId}/resolution")
    public ResponseEntity<TimetableBoardResult> resolveRequest(
            @RequestHeader(KEY_HEADER) String manageKey,
            @PathVariable long requestId
    ) {
        return ok(timetableService.resolveRequest(manageKey, requestId));
    }

    private ResponseEntity<TimetableBoardResult> ok(TimetableBoardResult result) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);
    }
}
