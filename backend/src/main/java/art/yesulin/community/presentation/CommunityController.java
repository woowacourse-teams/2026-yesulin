package art.yesulin.community.presentation;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.community.application.CommunityLikeService;
import art.yesulin.community.application.CommunityMembershipService;
import art.yesulin.community.application.CommunityPage;
import art.yesulin.community.application.CommunityParticipation;
import art.yesulin.community.application.EntryResult;
import art.yesulin.community.application.LikeResult;
import art.yesulin.community.domain.CommunityAuthorMode;
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
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public/community/posts")
public class CommunityController {

    private static final String OWNER_COOKIE = CommunityIdentityController.COOKIE_NAME;

    private final CommunityMembershipService service;
    private final CommunityLikeService likes;

    @ModelAttribute
    public void preventSharedCaching(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
    }

    @GetMapping
    public CommunityPage posts(@RequestParam(defaultValue = "9223372036854775807") @Positive long before,
                               @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                               @LoginMember(required = false) MemberPrincipal member) {
        return service.posts(before, secret, member);
    }

    @GetMapping("/{id}")
    public EntryResult post(@PathVariable @Positive long id,
                            @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                            @LoginMember(required = false) MemberPrincipal member) {
        return service.post(id, secret, member);
    }

    @PutMapping("/{id}/likes")
    public LikeResult like(@PathVariable @Positive long id, @CookieValue(OWNER_COOKIE) String secret) {
        return likes.like(id, secret);
    }

    @DeleteMapping("/{id}/likes")
    public LikeResult unlike(@PathVariable @Positive long id, @CookieValue(OWNER_COOKIE) String secret) {
        return likes.unlike(id, secret);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResult create(@LoginMember(roles = MemberType.APPLICANT) MemberPrincipal member,
                              @Valid @RequestBody CreatePost request) {
        service.confirmWriter(member, request.expectedMemberId());
        return service.createPost(member, request.requestId(), request.title(), request.body(), request.authorMode());
    }

    @PutMapping("/{id}")
    public EntryResult edit(@PathVariable @Positive long id,
                            @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                            @LoginMember(required = false) MemberPrincipal member,
                            @Valid @RequestBody EditPost request) {
        return service.editPost(id, secret, member, request.title(), request.body());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Positive long id,
                       @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                       @LoginMember(required = false) MemberPrincipal member) {
        service.deletePost(id, secret, member);
    }

    @GetMapping("/{postId}/comments")
    public CommunityPage comments(@PathVariable @Positive long postId,
                                   @RequestParam(defaultValue = "0") @Min(0) long after,
                                   @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                                   @LoginMember(required = false) MemberPrincipal member) {
        return service.comments(postId, after, secret, member);
    }

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResult comment(@PathVariable @Positive long postId,
                               @LoginMember(roles = MemberType.APPLICANT) MemberPrincipal member,
                               @Valid @RequestBody CreateComment request) {
        service.confirmWriter(member, request.expectedMemberId());
        return service.createComment(postId, member, request.requestId(), request.body(), request.authorMode());
    }

    @PutMapping("/{postId}/comments/{id}")
    public EntryResult editComment(@PathVariable @Positive long postId, @PathVariable @Positive long id,
                                   @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                                   @LoginMember(required = false) MemberPrincipal member,
                                   @Valid @RequestBody EditComment request) {
        return service.editComment(postId, id, secret, member, request.body());
    }

    @DeleteMapping("/{postId}/comments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable @Positive long postId, @PathVariable @Positive long id,
                              @CookieValue(value = OWNER_COOKIE, required = false) String secret,
                              @LoginMember(required = false) MemberPrincipal member) {
        service.deleteComment(postId, id, secret, member);
    }

    @GetMapping("/participation")
    public CommunityParticipation participation(@LoginMember(required = false) MemberPrincipal member,
                                               @RequestParam(required = false) @Positive Long postId) {
        return service.participation(member, postId);
    }

    public record CreatePost(@NotNull UUID requestId, @NotBlank @Size(max = 100) String title,
                             @NotBlank @Size(max = 5000) String body, @NotNull CommunityAuthorMode authorMode,
                             @NotNull @Positive Long expectedMemberId) {
    }

    public record EditPost(@NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 5000) String body) {
    }

    public record CreateComment(@NotNull UUID requestId, @NotBlank @Size(max = 1000) String body,
                                @NotNull CommunityAuthorMode authorMode,
                             @NotNull @Positive Long expectedMemberId) {
    }

    public record EditComment(@NotBlank @Size(max = 1000) String body) {
    }
}
