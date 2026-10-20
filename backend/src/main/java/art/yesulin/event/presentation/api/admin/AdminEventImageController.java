package art.yesulin.event.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.event.application.image.EventImageService;
import art.yesulin.event.application.image.EventImageUploadResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 운영자가 이벤트 이미지를 브라우저에서 저장소로 바로 올릴 주소를 준다. 이벤트를 저장할 때 공개 주소로 확정한다. */
@RestController
@RequestMapping("/api/v1/admin/event-images")
@RequiredArgsConstructor
@LoginRequired
public class AdminEventImageController {

    private final EventImageService imageService;

    @PostMapping("/uploads")
    public ResponseEntity<EventImageUploadResult> prepareUpload(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody PrepareEventImageUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                imageService.prepare(principal.memberId(), request.contentType(), request.size())
        );
    }
}
