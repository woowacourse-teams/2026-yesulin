package art.yesulin.presentation.api.audition;

import art.yesulin.application.audition.PublicAuditionResult;
import art.yesulin.application.audition.PublicAuditionService;
import art.yesulin.application.file.FileService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/auditions")
@RequiredArgsConstructor
public class PublicAuditionController {

    private final PublicAuditionService publicAuditionService;
    private final FileService fileService;

    @GetMapping("/{auditionId}")
    public ResponseEntity<PublicAuditionResponse> find(@PathVariable UUID auditionId) {
        PublicAuditionResult result = publicAuditionService.find(auditionId);
        String posterUrl = fileService.readUrl(result.ownerId(), result.posterFileId());
        return ResponseEntity.ok(PublicAuditionResponse.from(result, posterUrl));
    }
}
