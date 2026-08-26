package art.yesulin.presentation.api.file;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileContentResult;
import art.yesulin.application.file.FileContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.SessionAttribute;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileContentController {

    private final FileContentService fileContentService;

    @GetMapping("/{fileId}/content")
    public ResponseEntity<byte[]> read(
            @SessionAttribute(MemberPrincipal.SESSION_ATTRIBUTE) MemberPrincipal principal,
            @PathVariable long fileId
    ) {
        FileContentResult content = fileContentService.read(principal.memberId(), fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(content.contentType()))
                .cacheControl(CacheControl.noStore().mustRevalidate())
                .body(content.bytes());
    }
}
