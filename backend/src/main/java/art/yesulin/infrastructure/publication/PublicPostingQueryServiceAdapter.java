package art.yesulin.infrastructure.publication;

import art.yesulin.application.publication.PublicPostingNotFoundException;
import art.yesulin.application.publication.PublicPostingQueryService;
import art.yesulin.application.publication.PublicPostingResult;
import art.yesulin.application.publication.RecommendedPostingResult;
import art.yesulin.infrastructure.company.CompanyJpaEntity;
import art.yesulin.infrastructure.company.CompanyJpaRepository;
import art.yesulin.infrastructure.recruitment.PerformanceJpaEntity;
import art.yesulin.infrastructure.recruitment.PerformanceJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import art.yesulin.infrastructure.recruitment.RoleJpaEntity;
import art.yesulin.infrastructure.recruitment.RoleJpaRepository;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class PublicPostingQueryServiceAdapter implements PublicPostingQueryService {

    private final PostingJpaRepository postingRepository;
    private final PerformanceJpaRepository performanceRepository;
    private final CompanyJpaRepository companyRepository;
    private final RoleJpaRepository roleRepository;
    private final PostingFieldJpaRepository fieldRepository;
    private final ObjectMapper objectMapper;

    public PublicPostingQueryServiceAdapter(
            PostingJpaRepository postingRepository,
            PerformanceJpaRepository performanceRepository,
            CompanyJpaRepository companyRepository,
            RoleJpaRepository roleRepository,
            PostingFieldJpaRepository fieldRepository,
            ObjectMapper objectMapper) {
        this.postingRepository = postingRepository;
        this.performanceRepository = performanceRepository;
        this.companyRepository = companyRepository;
        this.roleRepository = roleRepository;
        this.fieldRepository = fieldRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public PublicPostingResult findPosting(long postingId) {
        PostingJpaEntity posting = postingRepository.findById(postingId)
                .orElseThrow(() -> new PublicPostingNotFoundException(postingId));
        PerformanceJpaEntity performance = performanceRepository.findById(posting.performanceId())
                .orElseThrow(() -> new PublicPostingNotFoundException(postingId));
        CompanyJpaEntity company = companyRepository.findById(performance.companyId())
                .orElseThrow(() -> new PublicPostingNotFoundException(postingId));
        List<PublicPostingResult.PublicRole> roles = roleRepository
                .findAllByPostingIdOrderById(postingId).stream()
                .map(this::role)
                .toList();
        List<PublicPostingResult.PublicField> fields = fieldRepository
                .findAllByPostingIdOrderByDisplayOrder(postingId).stream()
                .map(this::field)
                .toList();
        return new PublicPostingResult(
                posting.id(),
                new PublicPostingResult.PublicPerformance(
                        performance.id(), performance.title(), performance.venue(), performance.posterUrl()),
                new PublicPostingResult.PublicCompany(company.id(), company.name()),
                posting.title(), posting.status(), posting.allowsMultipleRoles(),
                posting.recruitmentStartsAt().toInstant(ZoneOffset.UTC),
                posting.recruitmentEndsAt().toInstant(ZoneOffset.UTC),
                posting.applicationGuide(), roles, fields);
    }

    @Override
    public List<RecommendedPostingResult> findRecommended(Long excludePostingId, int limit) {
        return postingRepository.findAll().stream()
                .filter(posting -> !posting.id().equals(excludePostingId))
                .sorted((left, right) -> left.recruitmentStartsAt().compareTo(right.recruitmentStartsAt()))
                .limit(limit)
                .map(this::recommended)
                .toList();
    }

    private RecommendedPostingResult recommended(PostingJpaEntity posting) {
        PerformanceJpaEntity performance = performanceRepository.findById(posting.performanceId())
                .orElseThrow(() -> new PublicPostingNotFoundException(posting.id()));
        CompanyJpaEntity company = companyRepository.findById(performance.companyId())
                .orElseThrow(() -> new PublicPostingNotFoundException(posting.id()));
        return new RecommendedPostingResult(
                posting.id(), performance.title(), posting.title(), company.name(), posting.status(),
                posting.recruitmentStartsAt().toInstant(ZoneOffset.UTC),
                posting.recruitmentEndsAt().toInstant(ZoneOffset.UTC));
    }

    private PublicPostingResult.PublicRole role(RoleJpaEntity role) {
        return new PublicPostingResult.PublicRole(
                role.id(), role.name(), role.description(), role.quota(), role.genderCondition(),
                role.ageMin(), role.ageMax());
    }

    private PublicPostingResult.PublicField field(PostingFieldJpaEntity field) {
        return new PublicPostingResult.PublicField(
                field.id(), field.fieldKey(), field.label(), field.requiredField(), field.custom(),
                field.sectionName(), field.inputType(), field.displayOrder(), readConfig(field.configJson()));
    }

    private Map<String, Object> readConfig(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JacksonException exception) {
            throw new IllegalStateException("저장된 지원서 필드 설정이 올바르지 않습니다.", exception);
        }
    }
}
