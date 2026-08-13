package art.yesulin.infrastructure.application;

import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.application.application.ApplicationSubmissionService;
import art.yesulin.application.application.SubmissionAnswer;
import art.yesulin.application.application.SubmissionResult;
import art.yesulin.application.application.SubmitApplicationCommand;
import art.yesulin.domain.applicant.ApplicantId;
import art.yesulin.domain.application.Application;
import art.yesulin.domain.application.ConsentEvidence;
import art.yesulin.domain.application.SelectedRole;
import art.yesulin.domain.application.SnapshotDocument;
import art.yesulin.domain.application.Submission;
import art.yesulin.domain.recruitment.PostingId;
import art.yesulin.domain.recruitment.RoleId;
import art.yesulin.infrastructure.account.ApplicantJpaEntity;
import art.yesulin.infrastructure.account.ApplicantJpaRepository;
import art.yesulin.infrastructure.company.CompanyJpaEntity;
import art.yesulin.infrastructure.company.CompanyJpaRepository;
import art.yesulin.infrastructure.draft.DraftJpaEntity;
import art.yesulin.infrastructure.draft.DraftJpaRepository;
import art.yesulin.infrastructure.recruitment.PerformanceJpaEntity;
import art.yesulin.infrastructure.recruitment.PerformanceJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingFieldJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import art.yesulin.infrastructure.recruitment.RoleJpaEntity;
import art.yesulin.infrastructure.recruitment.RoleJpaRepository;
import art.yesulin.infrastructure.screening.ApplicationReviewJpaEntity;
import art.yesulin.infrastructure.screening.ApplicationReviewJpaRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@Service
public class ApplicationSubmissionServiceAdapter implements ApplicationSubmissionService {

    private final ApplicantJpaRepository applicantRepository;
    private final PostingJpaRepository postingRepository;
    private final PerformanceJpaRepository performanceRepository;
    private final CompanyJpaRepository companyRepository;
    private final RoleJpaRepository roleRepository;
    private final PostingFieldJpaRepository fieldRepository;
    private final DraftJpaRepository draftRepository;
    private final ApplicationJpaRepository applicationRepository;
    private final ApplicationRoleJpaRepository applicationRoleRepository;
    private final ApplicationAnswerJpaRepository answerRepository;
    private final ApplicationSnapshotJpaRepository snapshotRepository;
    private final ConsentSnapshotJpaRepository consentRepository;
    private final ApplicationReviewJpaRepository reviewRepository;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    public ApplicationSubmissionServiceAdapter(
            ApplicantJpaRepository applicantRepository,
            PostingJpaRepository postingRepository,
            PerformanceJpaRepository performanceRepository,
            CompanyJpaRepository companyRepository,
            RoleJpaRepository roleRepository,
            PostingFieldJpaRepository fieldRepository,
            DraftJpaRepository draftRepository,
            ApplicationJpaRepository applicationRepository,
            ApplicationRoleJpaRepository applicationRoleRepository,
            ApplicationAnswerJpaRepository answerRepository,
            ApplicationSnapshotJpaRepository snapshotRepository,
            ConsentSnapshotJpaRepository consentRepository,
            ApplicationReviewJpaRepository reviewRepository,
            Clock clock,
            ObjectMapper objectMapper) {
        this.applicantRepository = applicantRepository;
        this.postingRepository = postingRepository;
        this.performanceRepository = performanceRepository;
        this.companyRepository = companyRepository;
        this.roleRepository = roleRepository;
        this.fieldRepository = fieldRepository;
        this.draftRepository = draftRepository;
        this.applicationRepository = applicationRepository;
        this.applicationRoleRepository = applicationRoleRepository;
        this.answerRepository = answerRepository;
        this.snapshotRepository = snapshotRepository;
        this.consentRepository = consentRepository;
        this.reviewRepository = reviewRepository;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    @Transactional
    @Override
    public SubmissionResult submit(long authenticatedAccountId, SubmitApplicationCommand command) {
        Instant submittedAt = clock.instant();
        LocalDateTime utcSubmittedAt = LocalDateTime.ofInstant(submittedAt, ZoneOffset.UTC);
        ApplicantJpaEntity applicant = findApplicant(authenticatedAccountId);
        PostingJpaEntity posting = findOpenPosting(command.postingId(), utcSubmittedAt);
        DraftJpaEntity draft = findOwnedDraft(command, authenticatedAccountId);
        ensureNotSubmitted(applicant.id(), posting.id());
        List<RoleJpaEntity> roles = findRoles(command.roleIds());
        List<SubmissionAnswer> answers = normalizeAnswers(posting.id(), command.answers());
        ConsentEvidence consentEvidence = serverConsent(
                command.consentEvidence(), posting, answers);
        SnapshotDocument snapshot = createSnapshot(
                posting, roles, answers, command.basicInformation(), consentEvidence, submittedAt);
        Submission submission = toDomainSubmission(
                command, posting, roles, consentEvidence, snapshot, submittedAt);
        Application.submit(new ApplicantId(applicant.id()), submission);

        ApplicationJpaEntity saved = applicationRepository.save(ApplicationJpaEntity.create(
                applicant.id(), posting.id(), draft.id(), command.basicInformation(), utcSubmittedAt));
        saveRoles(saved.id(), roles);
        roles.forEach(role -> reviewRepository.save(
                ApplicationReviewJpaEntity.pending(saved.id(), role.id(), 1)));
        saveAnswers(saved.id(), answers);
        snapshotRepository.save(new ApplicationSnapshotJpaEntity(
                saved.id(), "1", snapshot.json(), utcSubmittedAt));
        saveConsents(saved.id(), consentEvidence, utcSubmittedAt);
        draft.markSubmitted(utcSubmittedAt);
        return new SubmissionResult(saved.id(), posting.id(), submittedAt);
    }

    private ApplicantJpaEntity findApplicant(long accountId) {
        return applicantRepository.findByAccountId(accountId)
                .orElseThrow(() -> new ApplicationSubmissionException(
                        "APPLICANT_REQUIRED", "지원자 계정만 제출할 수 있습니다."));
    }

    private PostingJpaEntity findOpenPosting(long postingId, LocalDateTime submittedAt) {
        PostingJpaEntity posting = postingRepository.findById(postingId)
                .orElseThrow(() -> new ApplicationSubmissionException(
                        "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다."));
        if (!posting.acceptsSubmissionAt(submittedAt)) {
            throw new ApplicationSubmissionException(
                    "POSTING_NOT_OPEN", "현재 지원할 수 없는 공고입니다.");
        }
        return posting;
    }

    private DraftJpaEntity findOwnedDraft(
            SubmitApplicationCommand command, long authenticatedAccountId) {
        DraftJpaEntity draft = draftRepository.findById(command.draftId())
                .orElseThrow(() -> new ApplicationSubmissionException(
                        "DRAFT_NOT_FOUND", "Draft를 찾을 수 없습니다."));
        if (!Long.valueOf(authenticatedAccountId).equals(draft.accountId())
                || !Long.valueOf(command.postingId()).equals(draft.postingId())
                || !"ACTIVE".equals(draft.status())) {
            throw new ApplicationSubmissionException(
                    "DRAFT_ACCESS_DENIED", "제출할 수 있는 Draft가 아닙니다.");
        }
        return draft;
    }

    private void ensureNotSubmitted(long applicantId, long postingId) {
        if (applicationRepository.existsByApplicantIdAndPostingId(applicantId, postingId)) {
            throw new ApplicationSubmissionException(
                    "APPLICATION_ALREADY_SUBMITTED", "이미 지원한 공고입니다.");
        }
    }

    private List<RoleJpaEntity> findRoles(List<Long> roleIds) {
        Map<Long, RoleJpaEntity> rolesById = roleRepository.findAllByIdIn(roleIds).stream()
                .collect(Collectors.toMap(RoleJpaEntity::id, Function.identity()));
        if (!rolesById.keySet().containsAll(roleIds)) {
            throw new ApplicationSubmissionException(
                    "ROLE_NOT_FOUND", "선택한 배역을 찾을 수 없습니다.");
        }
        return roleIds.stream().map(rolesById::get).toList();
    }

    private Submission toDomainSubmission(
            SubmitApplicationCommand command,
            PostingJpaEntity posting,
            List<RoleJpaEntity> roles,
            ConsentEvidence consentEvidence,
            SnapshotDocument snapshot,
            Instant submittedAt) {
        List<SelectedRole> selectedRoles = roles.stream()
                .map(role -> new SelectedRole(
                        new RoleId(role.id()), new PostingId(role.postingId())))
                .toList();
        return new Submission(
                new PostingId(command.postingId()), command.basicInformation(), selectedRoles,
                posting.allowsMultipleRoles(), consentEvidence, snapshot, submittedAt);
    }

    private void saveRoles(long applicationId, List<RoleJpaEntity> roles) {
        for (RoleJpaEntity role : roles) {
            ObjectNode roleSnapshot = objectMapper.createObjectNode();
            roleSnapshot.put("id", role.id());
            roleSnapshot.put("name", role.name());
            roleSnapshot.put("description", role.description());
            if (role.quota() == null) {
                roleSnapshot.putNull("quota");
            } else {
                roleSnapshot.put("quota", role.quota());
            }
            applicationRoleRepository.save(
                    new ApplicationRoleJpaEntity(
                            applicationId, role.id(), roleSnapshot.toString()));
        }
    }

    private void saveAnswers(long applicationId, List<SubmissionAnswer> answers) {
        for (SubmissionAnswer answer : answers) {
            answerRepository.save(new ApplicationAnswerJpaEntity(
                    applicationId, answer.key(), answer.label(), answer.answerJson(), answer.order()));
        }
    }

    private void saveConsents(
            long applicationId, ConsentEvidence evidence, LocalDateTime agreedAt) {
        Map<String, Boolean> consentByType = Map.of(
                "COLLECTION_AND_USE", evidence.collectionAndUse(),
                "THIRD_PARTY_PROVISION", evidence.thirdPartyProvision(),
                "PROFILE_SAVE", evidence.profileSave());
        consentByType.entrySet().stream()
                .filter(Map.Entry::getValue)
                .map(Map.Entry::getKey)
                .map(type -> new ConsentSnapshotJpaEntity(
                        applicationId,
                        type,
                        evidence.documentVersion(),
                        evidence.disclosureJson(),
                        agreedAt))
                .forEach(consentRepository::save);
    }

    private List<SubmissionAnswer> normalizeAnswers(
            long postingId, List<SubmissionAnswer> incoming) {
        Map<String, SubmissionAnswer> incomingByKey = incoming.stream()
                .collect(Collectors.toMap(
                        SubmissionAnswer::key, Function.identity(),
                        (first, second) -> {
                            throw new ApplicationSubmissionException(
                                    "DUPLICATED_ANSWER", "같은 지원 항목을 중복 제출할 수 없습니다.");
                        }));
        List<PostingFieldJpaEntity> fields =
                fieldRepository.findAllByPostingIdOrderByDisplayOrder(postingId);
        for (PostingFieldJpaEntity field : fields) {
            SubmissionAnswer answer = incomingByKey.get(field.fieldKey());
            if (field.requiredField() && (answer == null || !hasMeaningfulValue(answer))) {
                throw new ApplicationSubmissionException(
                        "REQUIRED_ANSWER_MISSING", field.label() + " 항목은 필수입니다.");
            }
        }
        return fields.stream()
                .filter(field -> incomingByKey.containsKey(field.fieldKey()))
                .map(field -> new SubmissionAnswer(
                        field.fieldKey(), field.label(),
                        incomingByKey.get(field.fieldKey()).answerJson(), field.displayOrder()))
                .toList();
    }

    private boolean hasMeaningfulValue(SubmissionAnswer answer) {
        try {
            JsonNode value = objectMapper.readTree(answer.answerJson());
            if (value == null || value.isNull()) {
                return false;
            }
            if (value.isTextual()) {
                return !value.textValue().isBlank();
            }
            return (!value.isArray() && !value.isObject()) || value.size() > 0;
        } catch (JacksonException exception) {
            throw new ApplicationSubmissionException(
                    "INVALID_ANSWER", "지원서 답변 형식이 올바르지 않습니다.");
        }
    }

    private ConsentEvidence serverConsent(
            ConsentEvidence requested,
            PostingJpaEntity posting,
            List<SubmissionAnswer> answers) {
        ObjectNode disclosure = objectMapper.createObjectNode();
        disclosure.put("postingId", posting.id());
        disclosure.put("postingTitle", posting.title());
        ArrayNode submittedItems = disclosure.putArray("submittedItems");
        answers.stream().map(SubmissionAnswer::label).distinct().forEach(submittedItems::add);
        submittedItems.add("선택 배역");
        submittedItems.add("제출 시각");
        ObjectNode collection = disclosure.putObject("collectionAndUse");
        collection.put("controller", "예술IN 프로젝트팀");
        collection.put("purpose", "지원 접수, 지원자 식별, 중복 방지, 심사와 문의 처리");
        collection.put("retention", "정상 전형 종료 후 90일, 미마감은 모집 마감 후 120일");
        PerformanceJpaEntity performance = performanceRepository.findById(posting.performanceId())
                .orElseThrow(() -> new IllegalStateException("공고의 공연을 찾을 수 없습니다."));
        CompanyJpaEntity company = companyRepository.findById(performance.companyId())
                .orElseThrow(() -> new IllegalStateException("공고의 공연사를 찾을 수 없습니다."));
        ObjectNode provision = disclosure.putObject("thirdPartyProvision");
        provision.put("recipientCompanyId", company.id());
        provision.put("recipientCompanyName", company.name());
        provision.put("purpose", "오디션 접수·심사·일정·결과 연락과 동일 공연 결원 연락");
        provision.put("retention", "전형 종료 후 30일");
        return new ConsentEvidence(
                requested.collectionAndUse(), requested.thirdPartyProvision(),
                requested.profileSave(), "application-consent-v1", disclosure.toString());
    }

    private SnapshotDocument createSnapshot(
            PostingJpaEntity posting,
            List<RoleJpaEntity> roles,
            List<SubmissionAnswer> answers,
            art.yesulin.domain.application.BasicInformation basicInformation,
            ConsentEvidence consentEvidence,
            Instant submittedAt) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("schemaVersion", "1");
        root.put("submittedAt", submittedAt.toString());
        ObjectNode postingNode = root.putObject("posting");
        postingNode.put("id", posting.id());
        postingNode.put("title", posting.title());
        postingNode.put("allowsMultipleRoles", posting.allowsMultipleRoles());
        postingNode.put("recruitmentStartsAt",
                posting.recruitmentStartsAt().toInstant(ZoneOffset.UTC).toString());
        postingNode.put("recruitmentEndsAt",
                posting.recruitmentEndsAt().toInstant(ZoneOffset.UTC).toString());
        ArrayNode roleNodes = root.putArray("roles");
        roles.forEach(role -> {
            ObjectNode node = roleNodes.addObject();
            node.put("id", role.id());
            node.put("name", role.name());
            node.put("description", role.description());
        });
        root.set("basicInformation", objectMapper.valueToTree(basicInformation));
        ArrayNode answerNodes = root.putArray("answers");
        answers.forEach(answer -> {
            ObjectNode node = answerNodes.addObject();
            node.put("key", answer.key());
            node.put("label", answer.label());
            try {
                node.set("value", objectMapper.readTree(answer.answerJson()));
            } catch (JacksonException exception) {
                throw new ApplicationSubmissionException(
                        "INVALID_ANSWER", "지원서 답변 형식이 올바르지 않습니다.");
            }
        });
        ObjectNode consentNode = root.putObject("consent");
        consentNode.put("documentVersion", consentEvidence.documentVersion());
        consentNode.put("collectionAndUse", consentEvidence.collectionAndUse());
        consentNode.put("thirdPartyProvision", consentEvidence.thirdPartyProvision());
        consentNode.put("profileSave", consentEvidence.profileSave());
        return SnapshotDocument.of(root.toString());
    }
}
