package art.yesulin.presentation.api.otraudition;

import art.yesulin.application.otraudition.OtrSubmissionService;
import art.yesulin.application.otraudition.PublicOtrAuditionResult;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/otr-auditions")
@RequiredArgsConstructor
public class PublicOtrAuditionController {

    private final OtrSubmissionService service;

    @GetMapping("/{auditionId}")
    public ResponseEntity<PublicOtrAuditionResult> find(@PathVariable UUID auditionId) {
        return ResponseEntity.ok(service.findPublic(auditionId));
    }
}
