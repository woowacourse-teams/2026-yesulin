package art.yesulin.community.presentation;

import art.yesulin.community.application.CommunityPage;
import art.yesulin.community.application.CommunityService;
import art.yesulin.community.application.EntryResult;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public/community/posts")
public class CommunityController {

    private static final String OWNER_HEADER = "X-Community-Key";
    private final CommunityService service;

    @ModelAttribute
    public void preventSharedCaching(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
    }

    @GetMapping
    public CommunityPage posts(@RequestParam(defaultValue = "9223372036854775807") @Positive long before) {
        return service.posts(before);
    }

    @GetMapping("/{id}")
    public EntryResult post(@PathVariable @Positive long id,
                            @RequestHeader(value = OWNER_HEADER, required = false) String secret) {
        return service.post(id, secret);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResult create(@RequestHeader(OWNER_HEADER) String secret, @Valid @RequestBody CreatePost request) {
        return service.createPost(secret, request.requestId(), request.title(), request.body());
    }

    @PutMapping("/{id}")
    public EntryResult edit(@PathVariable @Positive long id, @RequestHeader(OWNER_HEADER) String secret,
                            @Valid @RequestBody EditPost request) {
        return service.editPost(id, secret, request.title(), request.body());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Positive long id, @RequestHeader(OWNER_HEADER) String secret) {
        service.deletePost(id, secret);
    }

    @GetMapping("/{postId}/comments")
    public CommunityPage comments(@PathVariable @Positive long postId,
                                   @RequestParam(defaultValue = "0") @Min(0) long after,
                                   @RequestHeader(value = OWNER_HEADER, required = false) String secret) {
        return service.comments(postId, after, secret);
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResult comment(@PathVariable @Positive long postId, @RequestHeader(OWNER_HEADER) String secret,
                               @Valid @RequestBody CreateComment request) {
        return service.createComment(postId, secret, request.requestId(), request.body());
    }

    @PutMapping("/{postId}/comments/{id}")
    public EntryResult editComment(@PathVariable @Positive long postId, @PathVariable @Positive long id,
                                   @RequestHeader(OWNER_HEADER) String secret,
                                   @Valid @RequestBody EditComment request) {
        return service.editComment(postId, id, secret, request.body());
    }

    @DeleteMapping("/{postId}/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable @Positive long postId, @PathVariable @Positive long id,
                              @RequestHeader(OWNER_HEADER) String secret) {
        service.deleteComment(postId, id, secret);
    }

    public record CreatePost(@NotNull UUID requestId, @NotBlank @Size(max = 100) String title,
                             @NotBlank @Size(max = 5000) String body) {
    }

    public record EditPost(@NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 5000) String body) {
    }

    public record CreateComment(@NotNull UUID requestId, @NotBlank @Size(max = 1000) String body) {
    }

    public record EditComment(@NotBlank @Size(max = 1000) String body) {
    }
}
