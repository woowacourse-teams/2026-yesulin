package art.yesulin.infrastructure.recruitment;

import art.yesulin.application.recruitment.PerformanceCommand;
import art.yesulin.application.recruitment.PerformanceResult;
import art.yesulin.application.recruitment.PostingCommand;
import art.yesulin.application.recruitment.PostingResult;
import art.yesulin.application.recruitment.RecruitmentException;
import art.yesulin.application.recruitment.RecruitmentService;
import art.yesulin.application.recruitment.RoleCommand;
import art.yesulin.application.recruitment.RoleResult;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecruitmentServiceAdapter implements RecruitmentService {

    private final PerformanceJpaRepository performanceRepository;
    private final PostingJpaRepository postingRepository;
    private final RoleJpaRepository roleRepository;
    private final Clock clock;

    public RecruitmentServiceAdapter(
            PerformanceJpaRepository performanceRepository,
            PostingJpaRepository postingRepository,
            RoleJpaRepository roleRepository,
            Clock clock) {
        this.performanceRepository = performanceRepository;
        this.postingRepository = postingRepository;
        this.roleRepository = roleRepository;
        this.clock = clock;
    }

    @Transactional
    @Override
    public PerformanceResult createPerformance(long companyId, PerformanceCommand command) {
        PerformanceJpaEntity entity = performanceRepository.save(PerformanceJpaEntity.create(
                null, companyId, command.title(), command.venue(), command.posterUrl(), now()));
        return performanceResult(entity);
    }

    @Transactional(readOnly = true)
    @Override
    public List<PerformanceResult> performances(long companyId) {
        return performanceRepository.findAllByCompanyIdOrderById(companyId).stream()
                .map(this::performanceResult)
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public PerformanceResult performance(long companyId, long performanceId) {
        return performanceResult(requirePerformance(companyId, performanceId));
    }

    @Transactional
    @Override
    public PerformanceResult updatePerformance(
            long companyId, long performanceId, PerformanceCommand command) {
        PerformanceJpaEntity entity = requirePerformance(companyId, performanceId);
        entity.update(command.title(), command.venue(), command.posterUrl(), now());
        return performanceResult(entity);
    }

    @Transactional
    @Override
    public void deletePerformance(long companyId, long performanceId) {
        PerformanceJpaEntity entity = requirePerformance(companyId, performanceId);
        if (!postingRepository.findAllByPerformanceIdOrderById(performanceId).isEmpty()) {
            throw new RecruitmentException(
                    "PERFORMANCE_HAS_POSTINGS", "공고가 있는 공연은 삭제할 수 없습니다.");
        }
        performanceRepository.delete(entity);
    }

    @Transactional
    @Override
    public PostingResult createPosting(
            long companyId, long performanceId, PostingCommand command) {
        requirePerformance(companyId, performanceId);
        validatePeriod(command);
        PostingJpaEntity entity = postingRepository.save(PostingJpaEntity.create(
                null, performanceId, command.title(), command.status(),
                command.allowsMultipleRoles(), command.recruitmentStartsAt(),
                command.recruitmentEndsAt(), command.applicationGuide(), now()));
        return postingResult(entity);
    }

    @Transactional(readOnly = true)
    @Override
    public List<PostingResult> postings(long companyId, long performanceId) {
        requirePerformance(companyId, performanceId);
        return postingRepository.findAllByPerformanceIdOrderById(performanceId).stream()
                .map(this::postingResult)
                .toList();
    }

    @Transactional(readOnly = true)
    @Override
    public PostingResult posting(long companyId, long postingId) {
        return postingResult(requirePosting(companyId, postingId));
    }

    @Transactional
    @Override
    public PostingResult updatePosting(long companyId, long postingId, PostingCommand command) {
        PostingJpaEntity entity = requirePosting(companyId, postingId);
        validatePeriod(command);
        entity.update(command.title(), command.status(), command.allowsMultipleRoles(),
                command.recruitmentStartsAt(), command.recruitmentEndsAt(),
                command.applicationGuide(), now());
        return postingResult(entity);
    }

    @Transactional
    @Override
    public void deletePosting(long companyId, long postingId) {
        PostingJpaEntity entity = requirePosting(companyId, postingId);
        if (!roleRepository.findAllByPostingIdOrderById(postingId).isEmpty()) {
            throw new RecruitmentException("POSTING_HAS_ROLES", "배역이 있는 공고는 삭제할 수 없습니다.");
        }
        postingRepository.delete(entity);
    }

    @Transactional
    @Override
    public RoleResult createRole(long companyId, long postingId, RoleCommand command) {
        requirePosting(companyId, postingId);
        validateRole(command);
        RoleJpaEntity entity = roleRepository.save(RoleJpaEntity.create(
                null, postingId, command.name(), command.description(), command.quota(),
                command.genderCondition(), command.ageMin(), command.ageMax(), now()));
        return roleResult(entity);
    }

    @Transactional(readOnly = true)
    @Override
    public List<RoleResult> roles(long companyId, long postingId) {
        requirePosting(companyId, postingId);
        return roleRepository.findAllByPostingIdOrderById(postingId).stream()
                .map(this::roleResult)
                .toList();
    }

    private PerformanceJpaEntity requirePerformance(long companyId, long performanceId) {
        return performanceRepository.findByIdAndCompanyId(performanceId, companyId)
                .orElseThrow(() -> notFound("공연"));
    }

    private PostingJpaEntity requirePosting(long companyId, long postingId) {
        PostingJpaEntity posting = postingRepository.findById(postingId)
                .orElseThrow(() -> notFound("공고"));
        requirePerformance(companyId, posting.performanceId());
        return posting;
    }

    private void validatePeriod(PostingCommand command) {
        if (!command.recruitmentStartsAt().isBefore(command.recruitmentEndsAt())) {
            throw new RecruitmentException("INVALID_RECRUITMENT_PERIOD", "모집 종료는 시작보다 늦어야 합니다.");
        }
    }

    private void validateRole(RoleCommand command) {
        if (command.quota() != null && command.quota() < 1) {
            throw new RecruitmentException("INVALID_ROLE_QUOTA", "모집 인원은 1명 이상이어야 합니다.");
        }
        if (command.ageMin() != null && command.ageMax() != null
                && command.ageMin() > command.ageMax()) {
            throw new RecruitmentException("INVALID_ROLE_AGE", "최소 나이는 최대 나이보다 클 수 없습니다.");
        }
    }

    private RecruitmentException notFound(String resource) {
        return new RecruitmentException("RECRUITMENT_RESOURCE_NOT_FOUND", resource + "을 찾을 수 없습니다.");
    }

    private PerformanceResult performanceResult(PerformanceJpaEntity entity) {
        return new PerformanceResult(entity.id(), entity.title(), entity.venue(),
                entity.posterUrl(), entity.createdAt());
    }

    private PostingResult postingResult(PostingJpaEntity entity) {
        return new PostingResult(entity.id(), entity.performanceId(), entity.title(), entity.status(),
                entity.allowsMultipleRoles(), entity.recruitmentStartsAt(),
                entity.recruitmentEndsAt(), entity.applicationGuide());
    }

    private RoleResult roleResult(RoleJpaEntity entity) {
        return new RoleResult(entity.id(), entity.postingId(), entity.name(), entity.description(),
                entity.quota(), entity.genderCondition(), entity.ageMin(), entity.ageMax());
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
