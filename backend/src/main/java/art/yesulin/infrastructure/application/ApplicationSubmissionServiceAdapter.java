package art.yesulin.infrastructure.application;

import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.application.application.ApplicationSubmissionService;
import art.yesulin.application.application.SubmissionAnswer;
import art.yesulin.application.application.SubmissionResult;
import art.yesulin.application.application.SubmitApplicationCommand;
import art.yesulin.domain.applicant.ApplicantId;
import art.yesulin.domain.application.Application;
import art.yesulin.domain.application.SelectedRole;
import art.yesulin.domain.application.Submission;
import art.yesulin.domain.recruitment.PostingId;
import art.yesulin.domain.recruitment.RoleId;
import art.yesulin.infrastructure.account.ApplicantJpaEntity;
import art.yesulin.infrastructure.account.ApplicantJpaRepository;
import art.yesulin.infrastructure.draft.DraftJpaEntity;
import art.yesulin.infrastructure.draft.DraftJpaRepository;
import art.yesulin.infrastructure.recruitment.PostingJpaEntity;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import art.yesulin.infrastructure.recruitment.RoleJpaEntity;
import art.yesulin.infrastructure.recruitment.RoleJpaRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationSubmissionServiceAdapter implements ApplicationSubmissionService {

    private final ApplicantJpaRepository applicantRepository;
    private final PostingJpaRepository postingRepository;
    private final RoleJpaRepository roleRepository;
    private final DraftJpaRepository draftRepository;
    private final ApplicationJpaRepository applicationRepository;
    private final ApplicationRoleJpaRepository applicationRoleRepository;
    private final ApplicationAnswerJpaRepository answerRepository;
    private final ApplicationSnapshotJpaRepository snapshotRepository;
    private final ConsentSnapshotJpaRepository consentRepository;
    private final Clock clock;

    public ApplicationSubmissionServiceAdapter(
            ApplicantJpaRepository applicantRepository,
            PostingJpaRepository postingRepository,
            RoleJpaRepository roleRepository,
            DraftJpaRepository draftRepository,
            ApplicationJpaRepository applicationRepository,
            ApplicationRoleJpaRepository applicationRoleRepository,
            ApplicationAnswerJpaRepository answerRepository,
            ApplicationSnapshotJpaRepository snapshotRepository,
            ConsentSnapshotJpaRepository consentRepository,
            Clock clock) {
        this.applicantRepository = applicantRepository;
        this.postingRepository = postingRepository;
        this.roleRepository = roleRepository;
        this.draftRepository = draftRepository;
        this.applicationRepository = applicationRepository;
        this.applicationRoleRepository = applicationRoleRepository;
        this.answerRepository = answerRepository;
        this.snapshotRepository = snapshotRepository;
        this.consentRepository = consentRepository;
        this.clock = clock;
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
        Submission submission = toDomainSubmission(command, roles, submittedAt);
        Application.submit(new ApplicantId(applicant.id()), submission);

        ApplicationJpaEntity saved = applicationRepository.save(ApplicationJpaEntity.create(
                applicant.id(), posting.id(), draft.id(), command.basicInformation(), utcSubmittedAt));
        saveRoles(saved.id(), roles);
        saveAnswers(saved.id(), command.answers());
        snapshotRepository.save(new ApplicationSnapshotJpaEntity(
                saved.id(), "1", command.snapshot().json(), utcSubmittedAt));
        saveConsents(saved.id(), command, utcSubmittedAt);
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
        List<RoleJpaEntity> roles = roleRepository.findAllByIdIn(roleIds);
        if (roles.size() != roleIds.size()) {
            throw new ApplicationSubmissionException(
                    "ROLE_NOT_FOUND", "선택한 배역을 찾을 수 없습니다.");
        }
        return roles;
    }

    private Submission toDomainSubmission(
            SubmitApplicationCommand command, List<RoleJpaEntity> roles, Instant submittedAt) {
        List<SelectedRole> selectedRoles = roles.stream()
                .map(role -> new SelectedRole(
                        new RoleId(role.id()), new PostingId(role.postingId())))
                .toList();
        return new Submission(
                new PostingId(command.postingId()), command.basicInformation(), selectedRoles,
                command.consentEvidence(), command.snapshot(), submittedAt);
    }

    private void saveRoles(long applicationId, List<RoleJpaEntity> roles) {
        for (RoleJpaEntity role : roles) {
            String snapshot = "{\"id\":" + role.id() + ",\"name\":\""
                    + role.name().replace("\"", "\\\"") + "\"}";
            applicationRoleRepository.save(
                    new ApplicationRoleJpaEntity(applicationId, role.id(), snapshot));
        }
    }

    private void saveAnswers(long applicationId, List<SubmissionAnswer> answers) {
        for (SubmissionAnswer answer : answers) {
            answerRepository.save(new ApplicationAnswerJpaEntity(
                    applicationId, answer.key(), answer.label(), answer.answerJson(), answer.order()));
        }
    }

    private void saveConsents(
            long applicationId, SubmitApplicationCommand command, LocalDateTime agreedAt) {
        Map<String, Boolean> consentByType = Map.of(
                "COLLECTION_AND_USE", command.consentEvidence().collectionAndUse(),
                "THIRD_PARTY_PROVISION", command.consentEvidence().thirdPartyProvision(),
                "PROFILE_SAVE", command.consentEvidence().profileSave());
        consentByType.entrySet().stream()
                .filter(Map.Entry::getValue)
                .map(Map.Entry::getKey)
                .map(type -> new ConsentSnapshotJpaEntity(
                        applicationId,
                        type,
                        command.consentEvidence().documentVersion(),
                        command.consentEvidence().disclosureJson(),
                        agreedAt))
                .forEach(consentRepository::save);
    }
}
