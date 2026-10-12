package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.AUTHOR_ALREADY_LINKED;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.NOT_FOUND;

import art.yesulin.auditionpost.application.AuditionPostOwnerOverview.AuthorLink;
import art.yesulin.auditionpost.application.AuditionPostOwnerOverview.Owner;
import art.yesulin.auditionpost.application.AuditionPostOwnerOverview.UnlinkedAuthor;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostAuthorCount;
import art.yesulin.auditionpost.domain.AuditionPostOwnerCount;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.authorlink.AuditionPostAuthorLink;
import art.yesulin.auditionpost.domain.authorlink.AuditionPostAuthorLinkRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 원문 작성자를 기획사 계정에 자동으로 연결하는 규칙과 운영자 업체별 보기. 규칙은 운영자만 만들고 지운다. 규칙을 만들면 그 작성자의
 * 기존 공고 중 기획사가 없는 공고도 함께 연결하고, 이후 가져오는 공고는 가져오기가 연결한다. 기획사가 직접 자기 원문 계정을
 * 등록하게 하면 남의 공고를 가져갈 수 있어 열지 않는다.
 */
@Slf4j
@Service
public class AuditionPostAuthorLinkService {

    /** 한 번에 원문을 읽는 공고 수. 요청이 길어지지 않게 나눠 읽는다. */
    static final int FILL_BATCH_SIZE = 20;
    private static final int MAX_UNLINKED_AUTHORS = 100;
    private static final String TARGET_TYPE = "AUDITION_POST_AUTHOR_LINK";

    private final AuditionPostRepository postRepository;
    private final AuditionPostAuthorLinkRepository linkRepository;
    private final AuditionPostOwners owners;
    private final AuditionPostSource source;
    private final AdminAuditLogRepository auditLogRepository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostAuthorLinkService(
            AuditionPostRepository postRepository,
            AuditionPostAuthorLinkRepository linkRepository,
            AuditionPostOwners owners,
            AuditionPostSource source,
            AdminAuditLogRepository auditLogRepository,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.postRepository = postRepository;
        this.linkRepository = linkRepository;
        this.owners = owners;
        this.source = source;
        this.auditLogRepository = auditLogRepository;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AuditionPostOwnerOverview findOverview() {
        List<AuditionPostAuthorLink> links = linkRepository.findAllByOrderByIdAsc();
        List<AuditionPostOwnerCount> counts = postRepository.countByOwner();
        Set<Long> ownerIds = new LinkedHashSet<>();
        counts.forEach(count -> ownerIds.add(count.ownerId()));
        links.forEach(link -> ownerIds.add(link.getOwnerId()));
        Map<Long, String> names = owners.namesOfIds(ownerIds);
        List<Owner> ownerRows = ownerIds.stream()
                .map(ownerId -> owner(ownerId, names.get(ownerId), counts, links))
                .sorted(Comparator.comparing(Owner::latestCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Owner::companyName, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        return new AuditionPostOwnerOverview(
                ownerRows,
                unlinkedAuthors(links),
                postRepository.countBySourceAndExternalIdIsNotNullAndSourceAuthorIdIsNull(source.getSource())
        );
    }

    /**
     * 원문 작성자를 기획사에 자동 연결하고, 그 작성자의 기존 공고 중 기획사가 없는 공고를 함께 연결한다.
     * 이미 같은 기획사에 연결돼 있으면 남은 공고만 다시 연결한다.
     */
    public AuditionPostAuthorLinkResult link(long adminId, String sourceName, String sourceAuthorId, long ownerId) {
        try {
            return Objects.requireNonNull(transactions.execute(status -> {
                Producer producer = owners.find(ownerId)
                        .orElseThrow(() -> new BusinessException(INVALID_INPUT, "기획사 계정을 찾을 수 없습니다."));
                AuditionPost latest = postRepository
                        .findFirstBySourceAndSourceAuthorIdOrderByIdDesc(sourceName, sourceAuthorId)
                        .orElseThrow(() -> new BusinessException(INVALID_INPUT, "이 원문 작성자의 공고가 없습니다."));
                Optional<AuditionPostAuthorLink> existing =
                        linkRepository.findBySourceAndSourceAuthorId(sourceName, sourceAuthorId);
                if (existing.isPresent() && existing.get().getOwnerId() != ownerId) {
                    throw alreadyLinked();
                }
                AuditionPostAuthorLink link = existing.orElseGet(() -> linkRepository.saveAndFlush(
                        new AuditionPostAuthorLink(
                                sourceName, sourceAuthorId, latest.getContent().getAuthorName(), ownerId, adminId,
                                clock.instant()
                        )
                ));
                int connected = postRepository.connectUnownedBySourceAuthor(sourceName, sourceAuthorId, ownerId);
                audit(adminId, link, AdminAction.AUDITION_POST_AUTHOR_LINKED,
                        "%s 작성자 #%s → 기획사 회원 %d, 공고 %d건 연결".formatted(
                                sourceName, sourceAuthorId, ownerId, connected
                        ));
                return new AuditionPostAuthorLinkResult(
                        link.getId(), link.getSource(), link.getSourceAuthorId(), link.getSourceAuthorName(),
                        ownerId, producer.getCompanyName(), connected
                );
            }));
        } catch (DataIntegrityViolationException exception) {
            throw alreadyLinked();
        }
    }

    /** 자동 연결 규칙을 지운다. 이미 연결된 공고는 그대로 두고, 이후 가져오는 공고만 연결하지 않는다. */
    @Transactional
    public void unlink(long adminId, long linkId) {
        AuditionPostAuthorLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "자동 연결을 찾을 수 없습니다."));
        linkRepository.delete(link);
        audit(adminId, link, AdminAction.AUDITION_POST_AUTHOR_UNLINKED,
                "%s 작성자 #%s 자동 연결 해제".formatted(link.getSource(), link.getSourceAuthorId()));
    }

    /**
     * 원문 작성자 번호를 읽기 전에 가져온 공고의 번호를 원문에서 읽어 채운다. 최근 공고부터 {@link #FILL_BATCH_SIZE}건씩 읽고,
     * 채운 번호에 자동 연결 규칙이 있으면 기획사가 없는 공고를 연결한다. 원문을 읽는 동안 트랜잭션을 잡지 않는다.
     *
     * @param beforeId 이전 결과의 {@code nextBeforeId}. 처음이면 null이다.
     */
    public AuditionPostAuthorFillResult fillMissingAuthors(Long beforeId) {
        List<AuditionPost> posts = postRepository.findMissingSourceAuthor(
                source.getSource(), beforeId == null ? Long.MAX_VALUE : beforeId, PageRequest.of(0, FILL_BATCH_SIZE)
        );
        int filled = 0;
        int connected = 0;
        int failed = 0;
        for (AuditionPost post : posts) {
            Optional<String> authorId;
            try {
                authorId = source.fetchAuthorId(post.getExternalId());
            } catch (RuntimeException exception) {
                log.warn("원문 작성자 번호 읽기 실패: {}-{}", post.getSource(), post.getExternalId());
                failed++;
                continue;
            }
            if (authorId.isEmpty()) {
                continue;
            }
            Boolean linked = transactions.execute(status -> fill(post.getId(), post.getSource(), authorId.get()));
            filled++;
            connected += Boolean.TRUE.equals(linked) ? 1 : 0;
        }
        Long next = posts.size() < FILL_BATCH_SIZE ? null : posts.getLast().getId();
        return new AuditionPostAuthorFillResult(
                posts.size(), filled, connected, failed, next,
                postRepository.countBySourceAndExternalIdIsNotNullAndSourceAuthorIdIsNull(source.getSource())
        );
    }

    /** 번호를 채우고, 자동 연결 규칙이 있으면 기획사가 없는 이 작성자의 공고를 연결한다. 이 공고를 연결했으면 true다. */
    private boolean fill(long postId, String sourceName, String authorId) {
        if (postRepository.fillSourceAuthor(postId, authorId) == 0) {
            return false;
        }
        Optional<AuditionPostAuthorLink> link = linkRepository.findBySourceAndSourceAuthorId(sourceName, authorId);
        if (link.isEmpty()) {
            return false;
        }
        postRepository.connectUnownedBySourceAuthor(sourceName, authorId, link.get().getOwnerId());
        return postRepository.findById(postId)
                .map(post -> Objects.equals(post.getOwnerId(), link.get().getOwnerId()))
                .orElse(false);
    }

    private static Owner owner(
            long ownerId,
            String companyName,
            List<AuditionPostOwnerCount> counts,
            List<AuditionPostAuthorLink> links
    ) {
        long published = 0;
        long hidden = 0;
        Instant latest = null;
        for (AuditionPostOwnerCount count : counts) {
            if (count.ownerId() != ownerId) {
                continue;
            }
            if (count.status() == AuditionPostStatus.PUBLISHED) {
                published += count.count();
            } else {
                hidden += count.count();
            }
            if (latest == null || count.latestCreatedAt().isAfter(latest)) {
                latest = count.latestCreatedAt();
            }
        }
        List<AuthorLink> authorLinks = links.stream()
                .filter(link -> link.getOwnerId() == ownerId)
                .map(link -> new AuthorLink(
                        link.getId(), link.getSource(), link.getSourceAuthorId(), link.getSourceAuthorName()
                ))
                .toList();
        return new Owner(ownerId, companyName, published, hidden, latest, authorLinks);
    }

    /**
     * 연결되지 않은 원문 공고를 작성자별로 묶는다. 번호가 있으면 번호로, 없으면 닉네임으로 묶고, 닉네임이 바뀐 작성자는 최근 닉네임을
     * 보여 준다. 자동 연결 규칙이 있는 작성자는 이미 처리됐으므로 뺀다.
     */
    private List<UnlinkedAuthor> unlinkedAuthors(List<AuditionPostAuthorLink> links) {
        Set<String> linked = links.stream()
                .map(link -> link.getSource() + "#" + link.getSourceAuthorId())
                .collect(Collectors.toSet());
        Map<String, List<AuditionPostAuthorCount>> groups = new LinkedHashMap<>();
        for (AuditionPostAuthorCount count : postRepository.countUnownedBySourceAuthor()) {
            String key = count.sourceAuthorId() == null
                    ? count.source() + "@" + count.authorName()
                    : count.source() + "#" + count.sourceAuthorId();
            if (!linked.contains(key)) {
                groups.computeIfAbsent(key, ignored -> new ArrayList<>()).add(count);
            }
        }
        Map<String, UnlinkedAuthor> merged = new HashMap<>();
        groups.forEach((key, rows) -> {
            AuditionPostAuthorCount newest = rows.stream()
                    .max(Comparator.comparing(AuditionPostAuthorCount::latestCreatedAt))
                    .orElseThrow();
            long total = rows.stream().mapToLong(AuditionPostAuthorCount::count).sum();
            merged.put(key, new UnlinkedAuthor(
                    newest.source(), newest.sourceAuthorId(), newest.authorName(), total, newest.latestCreatedAt()
            ));
        });
        return merged.values().stream()
                .sorted(Comparator.comparingLong(UnlinkedAuthor::postCount).reversed()
                        .thenComparing(UnlinkedAuthor::latestCreatedAt, Comparator.reverseOrder()))
                .limit(MAX_UNLINKED_AUTHORS)
                .toList();
    }

    private void audit(long adminId, AuditionPostAuthorLink link, AdminAction action, String detail) {
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, link.getId(), detail));
    }

    private static BusinessException alreadyLinked() {
        return new BusinessException(
                AUTHOR_ALREADY_LINKED, "이미 다른 기획사에 자동 연결된 원문 작성자입니다. 연결을 먼저 해제해 주세요."
        );
    }
}
