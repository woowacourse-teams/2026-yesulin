package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.NOT_FOUND;

import art.yesulin.auditionpost.application.AuditionPostCompanyAuthorOverview.Author;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostAuthorCompanyCount;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.companylink.AuditionPostCompanyLink;
import art.yesulin.auditionpost.domain.companylink.AuditionPostCompanyLinkRepository;
import art.yesulin.company.application.AdminCompanyResult;
import art.yesulin.company.application.CompanyService;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.company.domain.CompanyStatus;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 원문 작성자를 공연사로 묶는 규칙과 운영자 작성자별 보기. 같은 작성자가 여러 번 올린 공고는 공고마다 공연사를 만들지 않고
 * 한 공연사에 모은다. 규칙을 만들면 그 작성자의 기존 공고 중 공연사가 없는 공고를 연결하고, 이후 가져오는 공고는 가져오기가
 * 연결한다. 작성자로 만든 공연사는 검토 전이라 운영자가 정보를 확인하고 공개해야 보인다.
 */
@Service
public class AuditionPostCompanyLinkService {

    private static final String TARGET_TYPE = "AUDITION_POST_COMPANY_LINK";
    private static final int MAX_AUTHORS = 500;

    private final AuditionPostRepository postRepository;
    private final AuditionPostCompanyLinkRepository linkRepository;
    private final CompanyService companies;
    private final AuditionPostSource source;
    private final AdminAuditLogRepository auditLogRepository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostCompanyLinkService(
            AuditionPostRepository postRepository,
            AuditionPostCompanyLinkRepository linkRepository,
            CompanyService companies,
            AuditionPostSource source,
            AdminAuditLogRepository auditLogRepository,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.postRepository = postRepository;
        this.linkRepository = linkRepository;
        this.companies = companies;
        this.source = source;
        this.auditLogRepository = auditLogRepository;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    /**
     * 원문 공고를 작성자별로 묶어 보여 준다. 번호가 있으면 번호로, 없으면 닉네임으로 묶고, 닉네임이 바뀐 작성자는 최근 닉네임을
     * 보여 준다. 공연사로 묶지 않은 작성자를 먼저 둔다.
     */
    @Transactional(readOnly = true)
    public AuditionPostCompanyAuthorOverview findOverview() {
        Map<String, AuditionPostCompanyLink> links = linkRepository.findAllByOrderByIdAsc().stream()
                .collect(Collectors.toMap(
                        link -> key(link.getSource(), link.getSourceAuthorId()), Function.identity()
                ));
        Map<String, List<AuditionPostAuthorCompanyCount>> groups = new LinkedHashMap<>();
        for (AuditionPostAuthorCompanyCount count : postRepository.countBySourceAuthorForCompany()) {
            String groupKey = count.sourceAuthorId() == null
                    ? count.source() + "@" + count.authorName()
                    : key(count.source(), count.sourceAuthorId());
            groups.computeIfAbsent(groupKey, ignored -> new ArrayList<>()).add(count);
        }
        Map<Long, String> names = companies.namesOf(
                links.values().stream().map(AuditionPostCompanyLink::getCompanyId).collect(Collectors.toSet())
        );
        List<Author> authors = new ArrayList<>();
        groups.forEach((groupKey, rows) -> authors.add(author(rows, links.get(groupKey), names)));
        authors.sort(Comparator.comparing((Author author) -> author.linkId() != null)
                .thenComparing(Author::postCount, Comparator.reverseOrder())
                .thenComparing(Author::latestCreatedAt, Comparator.reverseOrder()));
        return new AuditionPostCompanyAuthorOverview(
                authors.stream().limit(MAX_AUTHORS).toList(),
                postRepository.countBySourceAndExternalIdIsNotNullAndSourceAuthorIdIsNull(source.getSource())
        );
    }

    /**
     * 원문 작성자를 공연사로 묶고, 그 작성자의 공고 중 공연사가 없는 공고를 연결한다. 이미 다른 공연사로 묶었으면 그 공연사에 있던
     * 이 작성자의 공고도 함께 옮긴다. 운영자가 공고마다 따로 고른 다른 공연사는 바꾸지 않는다.
     */
    public AuditionPostCompanyLinkResult link(long adminId, String sourceName, String sourceAuthorId, long companyId) {
        return inTransaction(() -> {
            if (!companies.exists(companyId)) {
                throw new BusinessException(INVALID_INPUT, "공연사를 찾을 수 없습니다.");
            }
            return connect(adminId, sourceName, sourceAuthorId, companyId, latestOf(sourceName, sourceAuthorId));
        });
    }

    /** 원문 작성자의 최근 닉네임으로 검토 전 공연사를 만들고 그 작성자를 묶는다. */
    public AuditionPostCompanyLinkResult createCompany(long adminId, String sourceName, String sourceAuthorId) {
        return inTransaction(() -> {
            AuditionPost latest = latestOf(sourceName, sourceAuthorId);
            if (linkRepository.findBySourceAndSourceAuthorId(sourceName, sourceAuthorId).isPresent()) {
                throw new BusinessException(INVALID_INPUT, "이미 공연사로 묶은 작성자입니다.");
            }
            long companyId = companies.create(adminId, CompanyProfile.named(latest.getContent().getAuthorName())).id();
            return connect(adminId, sourceName, sourceAuthorId, companyId, latest);
        });
    }

    /**
     * 번호가 있고 아직 묶지 않은 모든 원문 작성자마다 최근 닉네임으로 검토 전 공연사를 만든다. 번호가 없는 작성자는 건너뛴다.
     * 작성자마다 따로 저장하므로 중간에 실패해도 앞에서 만든 공연사는 남는다.
     *
     * @return 새로 만든 공연사 수
     */
    public int createCompaniesForUnlinkedAuthors(long adminId) {
        List<Author> targets = findOverview().authors().stream()
                .filter(author -> author.sourceAuthorId() != null && author.linkId() == null)
                .toList();
        return (int) targets.stream().filter(author -> tryCreateCompany(adminId, author)).count();
    }

    /** 그 사이 다른 운영자가 묶은 작성자는 건너뛰고 false를 돌려준다. */
    private boolean tryCreateCompany(long adminId, Author author) {
        try {
            createCompany(adminId, author.source(), author.sourceAuthorId());
            return true;
        } catch (BusinessException exception) {
            return false;
        }
    }

    /** 운영자 공고 목록에서 그 공고의 공연사 정보를 열 때 쓴다. 공고에 연결이 없으면 같은 원문 작성자로 묶은 공연사를 찾는다. */
    @Transactional(readOnly = true)
    public AuditionPostCompanyProfile findPostCompany(long postId) {
        AuditionPost post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
        Long companyId = post.getCompanyId();
        boolean shared = false;
        if (companyId == null) {
            companyId = authorCompanyOf(post).orElse(null);
            shared = companyId != null;
        }
        return new AuditionPostCompanyProfile(
                companyId == null ? null : companies.findForAdmin(companyId), shared,
                post.getContent().getAuthorName(), post.getSourceAuthorId()
        );
    }

    /**
     * 운영자가 공고 목록에서 공연사 정보를 직접 쓴다. 공고의 공연사, 없으면 같은 원문 작성자로 묶은 공연사를 고치고, 둘 다 없으면
     * 새로 만든다. 원문 작성자 번호가 있으면 그 작성자를 이 공연사로 묶어 같은 작성자의 다른 공고와 이후 가져오는 공고에도
     * 같은 정보가 연결된다. {@code publish}면 저장하면서 공개하되, 운영자가 내린 공연사는 내린 채로 둔다. 다시 공개는 공연사
     * 관리에서 한다.
     */
    public AdminCompanyResult savePostCompany(long adminId, long postId, CompanyProfile profile, boolean publish) {
        try {
            return Objects.requireNonNull(transactions.execute(status -> {
                AuditionPost post = postRepository.findByIdForUpdate(postId)
                        .orElseThrow(() -> new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다."));
                Long existing = post.getCompanyId() != null ? post.getCompanyId() : authorCompanyOf(post).orElse(null);
                AdminCompanyResult saved = existing == null
                        ? companies.create(adminId, profile)
                        : companies.update(adminId, existing, profile);
                long companyId = saved.id();
                if (publish && saved.status() != CompanyStatus.HIDDEN) {
                    companies.changeStatus(adminId, companyId, CompanyStatus.PUBLISHED);
                }
                if (!Objects.equals(post.getCompanyId(), companyId)) {
                    post.changeCompany(companyId);
                    auditLogRepository.save(new AdminAuditLog(
                            adminId, AdminAction.AUDITION_POST_COMPANY_CHANGED, "AUDITION_POST", post.getId(),
                            "공연사 %d 연결".formatted(companyId)
                    ));
                }
                String authorId = post.getSourceAuthorId();
                if (authorId != null
                        && linkRepository.findBySourceAndSourceAuthorId(post.getSource(), authorId).isEmpty()) {
                    connect(adminId, post.getSource(), authorId, companyId, post);
                }
                return companies.findForAdmin(companyId);
            }));
        } catch (DataIntegrityViolationException exception) {
            throw new BusinessException(INVALID_INPUT, "같은 작성자의 공연사 정보를 다른 운영자가 먼저 저장했습니다. 다시 열어 주세요.");
        }
    }

    private Optional<Long> authorCompanyOf(AuditionPost post) {
        if (post.getSourceAuthorId() == null) {
            return Optional.empty();
        }
        return linkRepository.findBySourceAndSourceAuthorId(post.getSource(), post.getSourceAuthorId())
                .map(AuditionPostCompanyLink::getCompanyId);
    }

    /** 묶는 규칙만 지운다. 이미 연결된 공고는 그대로 두고, 이후 가져오는 공고만 연결하지 않는다. */
    @Transactional
    public void unlink(long adminId, long linkId) {
        AuditionPostCompanyLink link = linkRepository.findById(linkId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연사로 묶은 작성자를 찾을 수 없습니다."));
        linkRepository.delete(link);
        audit(adminId, link, AdminAction.AUDITION_POST_COMPANY_AUTHOR_UNLINKED,
                "%s 작성자 #%s 공연사 묶음 해제".formatted(link.getSource(), link.getSourceAuthorId()));
    }

    private static Author author(
            List<AuditionPostAuthorCompanyCount> rows,
            AuditionPostCompanyLink link,
            Map<Long, String> names
    ) {
        AuditionPostAuthorCompanyCount newest = rows.stream()
                .max(Comparator.comparing(AuditionPostAuthorCompanyCount::latestCreatedAt))
                .orElseThrow();
        return new Author(
                newest.source(), newest.sourceAuthorId(), newest.authorName(),
                rows.stream().mapToLong(AuditionPostAuthorCompanyCount::count).sum(),
                rows.stream().mapToLong(AuditionPostAuthorCompanyCount::companylessCount).sum(),
                newest.latestCreatedAt(),
                link == null ? null : link.getId(),
                link == null ? null : link.getCompanyId(),
                link == null ? null : names.get(link.getCompanyId())
        );
    }

    private AuditionPostCompanyLinkResult connect(
            long adminId,
            String sourceName,
            String sourceAuthorId,
            long companyId,
            AuditionPost latest
    ) {
        Optional<AuditionPostCompanyLink> existing =
                linkRepository.findBySourceAndSourceAuthorId(sourceName, sourceAuthorId);
        int moved = 0;
        AuditionPostCompanyLink link;
        if (existing.isPresent()) {
            link = existing.get();
            long previous = link.getCompanyId();
            if (previous != companyId) {
                link.changeCompany(companyId);
                moved = postRepository.moveCompanyBySourceAuthor(sourceName, sourceAuthorId, previous, companyId);
            }
        } else {
            link = linkRepository.saveAndFlush(new AuditionPostCompanyLink(
                    sourceName, sourceAuthorId, latest.getContent().getAuthorName(), companyId, adminId, clock.instant()
            ));
        }
        int connected = moved + postRepository.connectCompanylessBySourceAuthor(sourceName, sourceAuthorId, companyId);
        audit(adminId, link, AdminAction.AUDITION_POST_COMPANY_AUTHOR_LINKED,
                "%s 작성자 #%s → 공연사 %d, 공고 %d건 연결".formatted(sourceName, sourceAuthorId, companyId, connected));
        return new AuditionPostCompanyLinkResult(
                link.getId(), link.getSource(), link.getSourceAuthorId(), link.getSourceAuthorName(),
                companyId, companies.namesOf(List.of(companyId)).get(companyId), connected
        );
    }

    private AuditionPost latestOf(String sourceName, String sourceAuthorId) {
        return postRepository.findFirstBySourceAndSourceAuthorIdOrderByIdDesc(sourceName, sourceAuthorId)
                .orElseThrow(() -> new BusinessException(INVALID_INPUT, "이 원문 작성자의 공고가 없습니다."));
    }

    private AuditionPostCompanyLinkResult inTransaction(Supplier<AuditionPostCompanyLinkResult> work) {
        try {
            return Objects.requireNonNull(transactions.execute(status -> work.get()));
        } catch (DataIntegrityViolationException exception) {
            throw new BusinessException(INVALID_INPUT, "이미 공연사로 묶은 작성자입니다.");
        }
    }

    private void audit(long adminId, AuditionPostCompanyLink link, AdminAction action, String detail) {
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, link.getId(), detail));
    }

    private static String key(String sourceName, String sourceAuthorId) {
        return sourceName + "#" + sourceAuthorId;
    }
}
