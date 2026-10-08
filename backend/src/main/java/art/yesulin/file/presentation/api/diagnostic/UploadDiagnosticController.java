package art.yesulin.file.presentation.api.diagnostic;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.diagnostic.UploadDiagnosticService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/upload-diagnostics")
@RequiredArgsConstructor
@LoginRequired
public class UploadDiagnosticController {

    private final UploadDiagnosticService uploadDiagnosticService;

    @PostMapping
    public ResponseEntity<Void> record(
            @LoginMember(roles = {MemberType.APPLICANT, MemberType.PRODUCER, MemberType.ADMIN})
            MemberPrincipal principal,
            @RequestHeader("X-Request-Id") UUID incidentId,
            @Valid @RequestBody UploadDiagnosticRequest request
    ) {
        uploadDiagnosticService.record(incidentId, request.toCommand());
        return ResponseEntity.noContent().build();
    }
}
