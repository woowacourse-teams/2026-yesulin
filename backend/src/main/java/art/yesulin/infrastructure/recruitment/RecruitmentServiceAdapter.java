package art.yesulin.infrastructure.recruitment;

import art.yesulin.application.recruitment.PerformanceCommand;
import art.yesulin.application.recruitment.PerformanceResult;
import art.yesulin.application.recruitment.PostingCommand;
import art.yesulin.application.recruitment.PostingResult;
import art.yesulin.application.recruitment.RecruitmentException;
import art.yesulin.application.recruitment.RecruitmentService;
import art.yesulin.application.recruitment.RoleCommand;
import art.yesulin.application.recruitment.RoleResult;
import art.yesulin.infrastructure.application.ApplicationJpaRepository;
import art.yesulin.infrastructure.screening.ScreeningRoundJpaEntity;
import art.yesulin.infrastructure.screening.ScreeningRoundJpaRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecruitmentServiceAdapter implements RecruitmentService {

    private static final java.util.Set<String> REQUIRED_BASIC_FIELDS = java.util.Set.of(
            "NAME", "PHONE", "BIRTH", "GENDER", "BODY", "EMAIL", "RESIDENCE");

    private final PerformanceJpaRepository performanceRepository;
    private final PostingJpaRepository postingRepository;
    private final RoleJpaRepository roleRepository;
    private final PerformanceRoleTemplateJpaRepository roleTemplateRepository;
    private final PostingFieldJpaRepository fieldRepository;
    private final ScreeningRoundJpaRepository roundRepository;
    private final ApplicationJpaRepository applicationRepository;
    private final Clock clock;

    public RecruitmentServiceAdapter(
            PerformanceJpaRepository performanceRepository,
            PostingJpaRepository postingRepository,
            RoleJpaRepository roleRepository,
            PerformanceRoleTemplateJpaRepository roleTemplateRepository,
            PostingFieldJpaRepository fieldRepository,
            ScreeningRoundJpaRepository roundRepository,
            ApplicationJpaRepository applicationRepository,
            Clock clock) {
        this.performanceRepository = performanceRepository;
        this.postingRepository = postingRepository;
        this.roleRepository = roleRepository;
        this.roleTemplateRepository = roleTemplateRepository;
        this.fieldRepository = fieldRepository;
        this.roundRepository = roundRepository;
        this.applicationRepository = applicationRepository;
        this.clock = clock;
    }

    @Transactional
    @Override
    public PerformanceResult createPerformance(long companyId, PerformanceCommand command) {
        PerformanceJpaEntity entity = performanceRepository.save(PerformanceJpaEntity.create(
                null, companyId, command.title(), command.venue(), command.posterUrl(), now()));
        saveRoleTemplates(entity.id(), command.roleTemplates());
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
        if (!command.roleTemplates().isEmpty()) {
            if (!postingRepository.findAllByPerformanceIdOrderById(performanceId).isEmpty()) {
                throw new RecruitmentException(
                        "ROLE_TEMPLATES_LOCKED", "공고가 있는 공연의 배역 템플릿은 바꿀 수 없습니다.");
            }
            roleTemplateRepository.deleteAll(
                    roleTemplateRepository.findAllByPerformanceIdOrderById(performanceId));
            saveRoleTemplates(performanceId, command.roleTemplates());
        }
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
        roleTemplateRepository.deleteAll(
                roleTemplateRepository.findAllByPerformanceIdOrderById(performanceId));
        performanceRepository.delete(entity);
    }

    @Transactional
    @Override
    public PostingResult createPosting(
            long companyId, long performanceId, PostingCommand command) {
        requirePerformance(companyId, performanceId);
        validatePeriod(command);
        PostingJpaEntity entity = postingRepository.save(PostingJpaEntity.create(
                null, performanceId, command.title(), statusAt(command),
                command.allowsMultipleRoles(), command.recruitmentStartsAt(),
                command.recruitmentEndsAt(), command.applicationGuide(), now()));
        savePostingConfiguration(entity, command);
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
        if (!now().isBefore(entity.recruitmentStartsAt())) {
            throw new RecruitmentException(
                    "POSTING_UPDATE_NOT_ALLOWED",
                    "모집 시작 전 공고만 수정할 수 있습니다.");
        }
        if (applicationRepository.existsByPostingId(postingId)) {
            throw new RecruitmentException(
                    "POSTING_UPDATE_NOT_ALLOWED",
                    "지원자가 있는 공고는 수정할 수 없습니다.");
        }
        clearPostingConfiguration(postingId);
        savePostingConfiguration(entity, command);
        entity.update(command.title(), statusAt(command), command.allowsMultipleRoles(),
                command.recruitmentStartsAt(), command.recruitmentEndsAt(),
                command.applicationGuide(), now());
        return postingResult(entity);
    }

    @Transactional
    @Override
    public void deletePosting(long companyId, long postingId) {
        PostingJpaEntity entity = requirePosting(companyId, postingId);
        if (applicationRepository.existsByPostingId(postingId)) {
            throw new RecruitmentException(
                    "POSTING_HAS_APPLICANTS", "지원자가 있는 공고는 삭제할 수 없습니다.");
        }
        clearPostingConfiguration(postingId);
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
        if (command.roles().isEmpty()) {
            throw new RecruitmentException("POSTING_ROLE_REQUIRED", "모집 배역을 하나 이상 선택해야 합니다.");
        }
        java.util.Set<String> requiredFields = command.applicationFields().stream()
                .filter(field -> field.required() && "BASIC".equals(field.section()))
                .map(art.yesulin.application.recruitment.PostingFieldCommand::key)
                .collect(java.util.stream.Collectors.toSet());
        if (!requiredFields.containsAll(REQUIRED_BASIC_FIELDS)) {
            throw new RecruitmentException(
                    "REQUIRED_APPLICATION_FIELDS_MISSING",
                    "이름, 연락처, 생년월일, 성별, 키·몸무게, 이메일, 거주지는 필수입니다.");
        }
        List<Integer> roundNumbers = command.rounds().stream()
                .map(art.yesulin.application.recruitment.ScreeningRoundCommand::round)
                .sorted()
                .toList();
        if (roundNumbers.isEmpty() || roundNumbers.size() > 3
                || !roundNumbers.equals(java.util.stream.IntStream
                        .rangeClosed(1, roundNumbers.size()).boxed().toList())) {
            throw new RecruitmentException(
                    "INVALID_SCREENING_ROUNDS", "전형 차수는 1차부터 연속된 최대 3차여야 합니다.");
        }
    }

    private String statusAt(PostingCommand command) {
        LocalDateTime current = now();
        if (current.isBefore(command.recruitmentStartsAt())) {
            return "UPCOMING";
        }
        return current.isBefore(command.recruitmentEndsAt()) ? "OPEN" : "CLOSED";
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
                entity.posterUrl(), entity.createdAt().toInstant(ZoneOffset.UTC),
                roleTemplateRepository.findAllByPerformanceIdOrderById(entity.id()).stream()
                        .map(template -> new art.yesulin.application.recruitment.RoleTemplateResult(
                                template.id(), template.name(), template.description(),
                                template.genderCondition(), template.ageMin(), template.ageMax()))
                        .toList());
    }

    private void saveRoleTemplates(
            long performanceId,
            List<art.yesulin.application.recruitment.RoleTemplateCommand> templates) {
        for (art.yesulin.application.recruitment.RoleTemplateCommand template : templates) {
            if (template.ageMin() > template.ageMax()) {
                throw new RecruitmentException(
                        "INVALID_ROLE_AGE", "최소 나이는 최대 나이보다 클 수 없습니다.");
            }
            roleTemplateRepository.save(PerformanceRoleTemplateJpaEntity.create(
                    performanceId, template.name(), template.description(),
                    template.genderCondition(), template.ageMin(), template.ageMax(), now()));
        }
    }

    private PostingResult postingResult(PostingJpaEntity entity) {
        List<RoleResult> roles = roleRepository.findAllByPostingIdOrderById(entity.id()).stream()
                .map(this::roleResult)
                .toList();
        return new PostingResult(entity.id(), entity.performanceId(), entity.title(), entity.status(),
                entity.allowsMultipleRoles(),
                entity.recruitmentStartsAt().toInstant(ZoneOffset.UTC),
                entity.recruitmentEndsAt().toInstant(ZoneOffset.UTC), entity.applicationGuide(),
                roles,
                roles.stream().flatMap(role -> roundRepository
                                .findAllByRoleIdOrderByRoundNumber(role.id()).stream())
                        .map(round -> new art.yesulin.application.recruitment.ScreeningRoundResult(
                                round.id(), round.roleId(), round.roundNumber(), round.name(),
                                round.scheduledDate(), round.note(), round.status(),
                                round.closedAt() == null ? null
                                        : round.closedAt().toInstant(ZoneOffset.UTC)))
                        .toList(),
                fieldRepository.findAllByPostingIdOrderByDisplayOrder(entity.id()).stream()
                        .map(field -> new art.yesulin.application.recruitment.PostingFieldResult(
                                field.id(), field.fieldKey(), field.label(), field.requiredField(),
                                field.custom(), field.sectionName(), field.inputType(),
                                field.displayOrder(), field.configJson()))
                        .toList());
    }

    private RoleResult roleResult(RoleJpaEntity entity) {
        return new RoleResult(entity.id(), entity.postingId(), entity.templateId(),
                entity.name(), entity.description(),
                entity.quota(), entity.genderCondition(), entity.ageMin(), entity.ageMax());
    }

    private void savePostingConfiguration(PostingJpaEntity posting, PostingCommand command) {
        Map<Long, PerformanceRoleTemplateJpaEntity> templates = roleTemplateRepository
                .findAllByPerformanceIdOrderById(posting.performanceId()).stream()
                .collect(Collectors.toMap(
                        PerformanceRoleTemplateJpaEntity::id, Function.identity()));
        for (art.yesulin.application.recruitment.PostingRoleSelection selected : command.roles()) {
            PerformanceRoleTemplateJpaEntity template = templates.get(selected.templateId());
            if (template == null) {
                throw new RecruitmentException(
                        "ROLE_TEMPLATE_NOT_FOUND", "공연에 속한 배역 템플릿을 찾을 수 없습니다.");
            }
            if (selected.quota() < 1) {
                throw new RecruitmentException(
                        "INVALID_ROLE_QUOTA", "모집 인원은 1명 이상이어야 합니다.");
            }
            RoleJpaEntity role = roleRepository.save(RoleJpaEntity.createFromTemplate(
                    posting.id(), template.id(), template.name(), template.description(),
                    selected.quota(), template.genderCondition(), template.ageMin(),
                    template.ageMax(), now()));
            for (art.yesulin.application.recruitment.ScreeningRoundCommand round : command.rounds()) {
                roundRepository.save(ScreeningRoundJpaEntity.create(
                        role.id(), round.round(), round.name(), round.date(), round.note()));
            }
        }
        java.util.Set<String> fieldKeys = new java.util.HashSet<>();
        for (art.yesulin.application.recruitment.PostingFieldCommand field :
                command.applicationFields()) {
            if (!fieldKeys.add(field.key())) {
                throw new RecruitmentException(
                        "DUPLICATED_POSTING_FIELD", "지원서 항목 키는 중복될 수 없습니다.");
            }
            fieldRepository.save(PostingFieldJpaEntity.create(
                    posting.id(), null, field.key(), field.label(), field.inputType(),
                    field.required(), field.custom(), field.section(), field.order(),
                    field.configJson()));
        }
    }

    private void clearPostingConfiguration(long postingId) {
        List<RoleJpaEntity> roles = roleRepository.findAllByPostingIdOrderById(postingId);
        roles.forEach(role -> roundRepository.deleteAllByRoleId(role.id()));
        roleRepository.deleteAllByPostingId(postingId);
        fieldRepository.deleteAllByPostingId(postingId);
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
