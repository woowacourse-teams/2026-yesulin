package art.yesulin.file.presentation.api;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.file.application.FileContentResult;
import art.yesulin.file.application.FileContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@LoginRequired
public class FileContentController {

    private final FileContentService fileContentService;

    @GetMapping("/{fileId}/content")
    public ResponseEntity<byte[]> read(
            @LoginMember MemberPrincipal principal,
            @PathVariable long fileId
    ) {
        FileContentResult content = fileContentService.read(principal.memberId(), principal.role(), fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(content.bytes());
    }
}
