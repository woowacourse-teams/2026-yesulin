package art.yesulin.auditionpost.presentation.api.producer;

import art.yesulin.auditionpost.application.AuditionPostEditResult;
import art.yesulin.auditionpost.application.AuditionPostUploadResult;
import art.yesulin.auditionpost.application.AuditionPostUploadService;
import art.yesulin.auditionpost.application.AuditionPostWriteService;
import art.yesulin.auditionpost.application.ProducerAuditionPostResult;
import art.yesulin.auditionpost.presentation.api.PrepareAuditionPostUploadRequest;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 이메일 인증을 마친 기획사가 공고를 올리고 자기 공고를 고친다. 올린 공고는 바로 공개된다. */
@RestController
@RequestMapping("/api/v1/producers/me/audition-posts")
@RequiredArgsConstructor
@LoginRequired
public class ProducerAuditionPostController {

    private final AuditionPostWriteService writeService;
    private final AuditionPostUploadService uploadService;

    @GetMapping
    public ResponseEntity<ProducerAuditionPostsResponse> findAll(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal
    ) {
        return ResponseEntity.ok(new ProducerAuditionPostsResponse(writeService.findOwned(principal.memberId())));
    }

    @PostMapping
    public ResponseEntity<ProducerAuditionPostResult> publish(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody ProducerWriteAuditionPostRequest request
    ) {
        ProducerAuditionPostResult result = writeService.publishByOwner(principal.memberId(), request.toCommand());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /** 사진·첨부를 브라우저가 저장소로 바로 올릴 주소를 준다. 공고를 저장할 때 공개 주소로 이 업로드를 확정한다. */
    @PostMapping("/uploads")
    public ResponseEntity<AuditionPostUploadResult> prepareUpload(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @Valid @RequestBody PrepareAuditionPostUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(uploadService.prepare(
                principal.memberId(), request.kind(), request.filename(), request.contentType(), request.size()
        ));
    }

    @GetMapping("/{postId}")
    public ResponseEntity<AuditionPostEditResult> find(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long postId
    ) {
        return ResponseEntity.ok(writeService.findOwnedForEdit(principal.memberId(), postId));
    }

    @PutMapping("/{postId}")
    public ResponseEntity<ProducerAuditionPostResult> edit(
            @LoginMember(roles = MemberType.PRODUCER, statuses = MemberStatus.ACTIVE) MemberPrincipal principal,
            @PathVariable long postId,
            @Valid @RequestBody ProducerWriteAuditionPostRequest request
    ) {
        return ResponseEntity.ok(writeService.editOwned(principal.memberId(), postId, request.toCommand()));
    }
}
