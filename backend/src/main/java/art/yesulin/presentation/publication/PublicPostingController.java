package art.yesulin.presentation.publication;

import art.yesulin.application.publication.PublicPostingQueryService;
import art.yesulin.application.publication.PublicPostingResult;
import art.yesulin.application.publication.RecommendedPostingResult;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
public class PublicPostingController {

    private final PublicPostingQueryService queryService;

    public PublicPostingController(PublicPostingQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/api/v1/public/postings/{postingId}")
    public PublicPostingResult posting(@PathVariable long postingId) {
        return queryService.findPosting(postingId);
    }

    @GetMapping("/api/v1/public/recommended-postings")
    public Map<String, List<RecommendedPostingResult>> recommended(
            @RequestParam(required = false) Long excludePostingId,
            @RequestParam(defaultValue = "3") @Min(1) @Max(10) int limit) {
        return Map.of("postings", queryService.findRecommended(excludePostingId, limit));
    }
}
