package art.yesulin.show.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.FileService;
import art.yesulin.show.application.AdminShowManagementService;
import art.yesulin.show.application.ProducerShowResult;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자가 직접 등록한 외부 링크 공연과 회차를 관리한다. 목록은 운영 대시보드 조회({@code GET /api/v1/admin/shows})가 맡고,
 * 응답은 기획사 관리 화면과 같은 {@link ProducerShowResponse}를 쓴다.
 */
@RestController
@RequestMapping("/api/v1/admin/shows")
@RequiredArgsConstructor
@LoginRequired
public class AdminShowManagementController {

    private final AdminShowManagementService adminShowManagementService;
    private final FileService fileService;

    @PostMapping
    public ResponseEntity<ProducerShowResponse> create(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody AdminSaveShowRequest request
    ) {
        ProducerShowResult result = adminShowManagementService.create(
                principal.memberId(), request.toCommand(), request.externalReservationUrl()
        );
        return ResponseEntity.created(URI.create("/api/v1/admin/shows/" + result.id())).body(response(result));
    }

    @GetMapping("/{showId}")
    public ResponseEntity<ProducerShowResponse> find(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        return ResponseEntity.ok(response(adminShowManagementService.find(showId)));
    }

    @PutMapping("/{showId}")
    public ResponseEntity<ProducerShowResponse> update(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId,
            @Valid @RequestBody AdminSaveShowRequest request
    ) {
        return ResponseEntity.ok(response(
                adminShowManagementService.update(showId, request.toCommand(), request.externalReservationUrl())
        ));
    }

    @DeleteMapping("/{showId}")
    public ResponseEntity<Void> delete(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        adminShowManagementService.delete(principal.memberId(), showId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{showId}/opening")
    public ResponseEntity<ProducerShowResponse> open(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        return ResponseEntity.ok(response(adminShowManagementService.open(principal.memberId(), showId)));
    }

    @PostMapping("/{showId}/closing")
    public ResponseEntity<ProducerShowResponse> close(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId
    ) {
        return ResponseEntity.ok(response(adminShowManagementService.close(principal.memberId(), showId)));
    }

    @PostMapping("/{showId}/sessions")
    public ResponseEntity<ProducerShowResponse> addSession(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId,
            @Valid @RequestBody AdminSaveShowSessionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(response(
                adminShowManagementService.addSession(showId, request.toCommand())
        ));
    }

    @PutMapping("/{showId}/sessions/{sessionId}")
    public ResponseEntity<ProducerShowResponse> updateSession(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId,
            @PathVariable long sessionId,
            @Valid @RequestBody AdminSaveShowSessionRequest request
    ) {
        return ResponseEntity.ok(response(
                adminShowManagementService.updateSession(showId, sessionId, request.toCommand())
        ));
    }

    @DeleteMapping("/{showId}/sessions/{sessionId}")
    public ResponseEntity<ProducerShowResponse> deleteSession(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @PathVariable UUID showId,
            @PathVariable long sessionId
    ) {
        return ResponseEntity.ok(response(adminShowManagementService.deleteSession(showId, sessionId)));
    }

    private ProducerShowResponse response(ProducerShowResult result) {
        return ProducerShowResponse.from(result, fileId -> fileService.readPublicUrl(result.ownerId(), fileId));
    }
}
