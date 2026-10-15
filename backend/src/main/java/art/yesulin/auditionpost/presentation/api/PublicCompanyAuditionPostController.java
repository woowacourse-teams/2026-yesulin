package art.yesulin.auditionpost.presentation.api;

import art.yesulin.auditionpost.application.AuditionPostService;
import art.yesulin.auditionpost.application.PublicAuditionPostSummaryResult;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공연사 화면에 보일 그 공연사의 공개 공고. 마감한 공고도 함께 최대 30건이다. */
@RestController
@RequestMapping("/api/v1/public/companies/{companyId}/audition-posts")
@RequiredArgsConstructor
public class PublicCompanyAuditionPostController {

    private final AuditionPostService auditionPostService;

    @GetMapping
    public ResponseEntity<PublicCompanyAuditionPostsResponse> findAll(@PathVariable long companyId) {
        return ResponseEntity.ok(
                new PublicCompanyAuditionPostsResponse(auditionPostService.findCompanyPosts(companyId))
        );
    }

    public record PublicCompanyAuditionPostsResponse(List<PublicAuditionPostSummaryResult> posts) {
    }
}
