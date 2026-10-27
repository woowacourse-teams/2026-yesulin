package art.yesulin.community.presentation;

import art.yesulin.community.application.CommunityReportService;
import art.yesulin.community.domain.ReportReason;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public/community/entries")
public class CommunityReportController {

    private final CommunityReportService service;

    @PostMapping("/{id}/reports")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void report(@PathVariable @Positive long id, @RequestHeader("X-Community-Key") String secret,
                       @Valid @RequestBody ReportRequest request) {
        service.report(id, secret, request.requestId(), request.reason(), request.detail());
    }

    public record ReportRequest(@NotNull UUID requestId, @NotNull ReportReason reason,
                                @Size(max = 1000) String detail) {
    }
}
