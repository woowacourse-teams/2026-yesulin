package art.yesulin.community.application;

import art.yesulin.auth.application.AuthErrorCode;
import art.yesulin.auth.application.AuthService;
import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.community.domain.CommunityAuthorMode;
import art.yesulin.community.domain.CommunityDigest;
import art.yesulin.community.domain.CommunityEntry;
import art.yesulin.community.domain.CommunityEntryRepository;
import art.yesulin.community.domain.CommunityErrorCode;
import art.yesulin.global.exception.BusinessException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommunityMembershipService {
    private final CommunityService entries;
    private final CommunityEntryRepository repository;
    private final AuthService auth;
    private final CommunityProfiles profiles;

    public void confirmWriter(MemberPrincipal principal, long expectedMemberId) {
        if (requireApplicant(principal) != expectedMemberId) {
            throw new BusinessException(CommunityErrorCode.REQUEST_CONFLICT, "로그인 계정이 바뀌었어요. 작성 내용을 다시 확인해 주세요.");
        }
    }

    public EntryResult createPost(MemberPrincipal principal, UUID request, String title, String body,
                                  CommunityAuthorMode mode) {
        long member = requireWriter(principal, mode);
        EntryResult result = entries.publishPost(key(member), member, mode, request, title, body);
        return decorate(result, null, principal, new HashMap<>());
    }

    public EntryResult createComment(long postId, MemberPrincipal principal, UUID request, String body,
                                     CommunityAuthorMode mode) {
        return createComment(postId, principal, request, body, mode, null);
    }

    public EntryResult createComment(long postId, MemberPrincipal principal, UUID request, String body,
                                     CommunityAuthorMode mode, Long replyToId) {
        long member = requireWriter(principal, mode);
        EntryResult result = entries.publishComment(new CommentTarget(postId, replyToId), key(member), member,
                mode, request, body);
        return decorate(result, null, principal, new HashMap<>());
    }

    @Transactional(readOnly = true)
    public CommunityPage posts(long before, String cookie, MemberPrincipal principal) {
        if (before != Long.MAX_VALUE && principal == null) {
            throw new BusinessException(AuthErrorCode.UNAUTHENTICATED, "이전 글을 보려면 로그인해 주세요.");
        }
        return decorate(entries.posts(before, cookie), cookie, principal);
    }

    @Transactional(readOnly = true)
    public EntryResult post(long id, String cookie, MemberPrincipal principal) {
        return decorate(entries.post(id, cookie), cookie, principal, new HashMap<>());
    }

    @Transactional(readOnly = true)
    public CommunityPage comments(long postId, long after, String cookie, MemberPrincipal principal) {
        return decorate(entries.comments(postId, after, cookie), cookie, principal);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public EntryResult editPost(long id, String cookie, MemberPrincipal principal, String title, String body) {
        entries.editOwnedPost(id, owner(id, id, cookie, principal), title, body);
        return post(id, cookie, principal);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deletePost(long id, String cookie, MemberPrincipal principal) {
        entries.deleteOwnedPost(id, owner(id, id, cookie, principal));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public EntryResult editComment(long postId, long id, String cookie, MemberPrincipal principal, String body) {
        EntryResult result = entries.editOwnedComment(postId, id, owner(postId, id, cookie, principal), body);
        return decorate(result, cookie, principal, new HashMap<>());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void deleteComment(long postId, long id, String cookie, MemberPrincipal principal) {
        entries.deleteOwnedComment(postId, id, owner(postId, id, cookie, principal));
    }

    @Transactional(readOnly = true)
    public CommunityParticipation participation(MemberPrincipal principal, Long postId) {
        if (principal == null) {
            return new CommunityParticipation(null, false, null, null);
        }
        MemberPrincipal current = auth.findCurrent(principal.memberId());
        if (!canWrite(current)) {
            return new CommunityParticipation(current.memberId(), false, null, null);
        }
        if (postId != null) {
            repository.findById(postId).orElseThrow(this::notFound).requirePost();
        }
        return new CommunityParticipation(current.memberId(), true, null, profiles.find(current.memberId()));
    }

    private long requireWriter(MemberPrincipal principal, CommunityAuthorMode mode) {
        long member = requireApplicant(principal);
        Objects.requireNonNull(mode, "작성 방식이 필요합니다.");
        if (mode == CommunityAuthorMode.PROFILE && !profiles.find(member).available()) {
            throw new BusinessException(CommunityErrorCode.PROFILE_REQUIRED, "공개된 배우 페이지가 필요해요.");
        }
        return member;
    }

    private long requireApplicant(MemberPrincipal principal) {
        if (principal == null) {
            throw new BusinessException(AuthErrorCode.UNAUTHENTICATED, "로그인이 필요합니다.");
        }
        if (!canWrite(auth.findCurrent(principal.memberId()))) {
            throw new BusinessException(AuthErrorCode.FORBIDDEN, "배우 계정으로 참여해 주세요.");
        }
        return principal.memberId();
    }

    private boolean canWrite(MemberPrincipal principal) {
        return principal.role() == MemberType.APPLICANT && principal.status() == MemberStatus.ACTIVE;
    }

    private String owner(long postId, long id, String cookie, MemberPrincipal principal) {
        repository.lockById(postId).orElseThrow(this::notFound).requirePost();
        CommunityEntry entry = repository.findById(id).orElseThrow(this::notFound);
        if (entry.getMemberId() == null) {
            return CommunityDigest.viewer(cookie);
        }
        return key(requireApplicant(principal));
    }

    private CommunityPage decorate(CommunityPage page, String cookie, MemberPrincipal principal) {
        Map<Long, CommunityProfile> cache = new HashMap<>();
        return new CommunityPage(page.items().stream().map(item -> decorate(item, cookie, principal, cache)).toList(),
                page.nextCursor());
    }

    private EntryResult decorate(EntryResult item, String cookie, MemberPrincipal principal,
                                 Map<Long, CommunityProfile> cache) {
        CommunityEntry entry = repository.findById(item.id()).orElseThrow(this::notFound);
        CommunityProfile author = new CommunityProfile(item.author(), null, null);
        if (entry.getAuthorMode() == CommunityAuthorMode.PROFILE) {
            author = cache.computeIfAbsent(entry.getMemberId(), profiles::find);
        }
        return item.withAuthor(author, editable(entry, cookie, principal));
    }

    private boolean editable(CommunityEntry entry, String cookie, MemberPrincipal principal) {
        if (entry.getMemberId() == null) {
            return entry.isOwnedBy(CommunityDigest.viewer(cookie));
        }
        return principal != null && canWrite(principal) && Objects.equals(entry.getMemberId(), principal.memberId());
    }

    private String key(long member) {
        return "member:" + member;
    }

    private BusinessException notFound() {
        return new BusinessException(CommunityErrorCode.NOT_FOUND, "글이나 댓글을 찾을 수 없어요.");
    }
}
