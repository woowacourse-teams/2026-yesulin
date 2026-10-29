package art.yesulin.audit.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** AI 제안을 원문에 실제로 있는 문구로 뒷받침되는 경우에만 채택한다. 유사 매칭이나 접미사 제거는 하지 않는다. */
public final class AuditAiAnalyzer {

    private static final int QUOTE_LENGTH = 120;
    private static final Map<String, String> SKIP_MESSAGES = Map.of(
            "NO_TEXT", "추출된 텍스트가 없어 AI가 지원 정보를 분석하지 않았습니다.",
            "NO_REVIEW", "연결된 심사가 없어 AI가 지원 정보를 분석하지 않았습니다.",
            "TEXT_LIMIT_EXCEEDED", "텍스트가 너무 길어 AI 분석을 건너뛰었습니다.",
            "PROVIDER_ERROR", "AI 분석 중 오류가 발생했습니다.",
            "INVALID_MODEL_OUTPUT", "AI 응답을 해석하지 못했습니다.");

    private AuditAiAnalyzer() {
    }

    public static AuditAnalysis analyze(String text, List<AuditRole> roles, AuditAiProposal proposal) {
        if (!proposal.completed()) {
            return new AuditAnalysis(null, null, AuditMatchStatus.NEEDS_CHECK, unfinishedMessage(proposal));
        }
        String source = AuditText.normalize(text);
        List<String> notes = new ArrayList<>();
        String name = groundedName(source, proposal, notes);
        String roleId = groundedRoleId(source, roles, proposal, notes);
        if (roleId == null) {
            if (proposal.roleId() == null && proposal.roleEvidence() == null) {
                notes.add("AI가 지원 배역을 찾지 못했습니다.");
            }
            return new AuditAnalysis(name, null, AuditMatchStatus.NEEDS_CHECK, String.join(" ", notes));
        }
        String roleName = roles.stream().filter(role -> role.getId().equals(roleId))
                .findFirst().orElseThrow().getName();
        notes.add(0, "AI가 지원 배역 " + quote(roleName) + "을(를) 제안했고 원문 근거 "
                + quote(AuditText.normalize(proposal.roleEvidence())) + "로 확인했습니다.");
        return new AuditAnalysis(name, roleId, AuditMatchStatus.MATCHED, String.join(" ", notes));
    }

    private static String groundedName(String source, AuditAiProposal proposal, List<String> notes) {
        if (proposal.applicantName() == null) {
            return null;
        }
        String name = AuditText.normalize(proposal.applicantName());
        String evidence = AuditText.normalize(proposal.applicantNameEvidence());
        boolean valid = !name.isEmpty() && AuditText.length(name) <= AuditApplicant.MAX_APPLICANT_NAME_LENGTH
                && isGrounded(source, evidence) && evidence.contains(name);
        if (!valid) {
            notes.add("AI가 제안한 이름은 원문 근거로 확인되지 않아 사용하지 않았습니다.");
            return null;
        }
        notes.add("AI가 제안한 이름의 원문 근거: " + quote(evidence));
        return name;
    }

    private static String groundedRoleId(String source, List<AuditRole> roles, AuditAiProposal proposal,
                                         List<String> notes) {
        if (proposal.roleId() == null) {
            return null;
        }
        if (roles.stream().noneMatch(role -> role.getId().equals(proposal.roleId()))) {
            notes.add("AI가 이 심사에 등록되지 않은 배역을 제안해 사용하지 않았습니다.");
            return null;
        }
        if (!isGrounded(source, AuditText.normalize(proposal.roleEvidence()))) {
            notes.add("AI가 제안한 배역은 원문 근거로 확인되지 않아 사용하지 않았습니다.");
            return null;
        }
        return proposal.roleId();
    }

    private static boolean isGrounded(String source, String evidence) {
        return !evidence.isEmpty() && source.contains(evidence);
    }

    private static String unfinishedMessage(AuditAiProposal proposal) {
        String reason = Objects.requireNonNullElse(proposal.reason(), "");
        return SKIP_MESSAGES.getOrDefault(reason, "AI 분석을 완료하지 못했습니다.") + " 직접 확인해 주세요.";
    }

    private static String quote(String value) {
        return "\"" + AuditText.abbreviate(value, QUOTE_LENGTH) + "\"";
    }
}
