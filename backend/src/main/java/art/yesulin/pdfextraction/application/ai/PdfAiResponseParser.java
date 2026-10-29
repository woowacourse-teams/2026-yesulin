package art.yesulin.pdfextraction.application.ai;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfApplicantInfo;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.ObjectReader;
import tools.jackson.databind.node.ObjectNode;

@Component
@RequiredArgsConstructor
public class PdfAiResponseParser {

    public static final int MAX_RESPONSE_SIZE = 128 * 1024;
    public static final int MAX_CAREERS = 5;
    public static final String INVALID_MODEL_OUTPUT = "INVALID_MODEL_OUTPUT";

    private static final Set<String> FIELDS = Set.of(
            "applicantName", "applicantNameEvidence", "roleId", "roleEvidence", "profile");
    private static final List<String> FACTS = List.of("birthDate", "age", "height", "education");
    private static final List<String> FACT_FIELDS = List.of("value", "evidence");
    private static final List<String> CAREER_FIELDS = List.of(
            "title", "venue", "part", "genre", "period", "company", "evidence");

    private final ObjectMapper mapper;

    public PdfApplicantInfo parse(String response, String source, List<PdfAiRole> roles,
                                  String provider, String model) {
        try {
            JsonNode root = readStrictObject(response);
            ObjectNode envelope = envelope(root, source, roles, provider, model);
            PdfApplicantInfo info = PdfApplicantInfo.parse(envelope);
            if (info.profile() != null) {
                info.profile().validateEvidence(source);
            }
            return info;
        } catch (JacksonException | BusinessException exception) {
            throw invalid();
        }
    }

    private JsonNode readStrictObject(String response) {
        require(response != null && response.length() <= MAX_RESPONSE_SIZE
                && response.getBytes(StandardCharsets.UTF_8).length <= MAX_RESPONSE_SIZE);
        String json = response.strip();
        require(json.startsWith("{") && json.endsWith("}"));
        ObjectReader reader = mapper.readerFor(JsonNode.class)
                .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .with(StreamReadFeature.STRICT_DUPLICATE_DETECTION);
        JsonNode root = reader.readTree(json);
        require(root != null && root.isObject());
        root.propertyNames().forEach(name -> require(FIELDS.contains(name)));
        return root;
    }

    private ObjectNode envelope(JsonNode root, String source, List<PdfAiRole> roles,
                                String provider, String model) {
        String normalizedSource = normalize(source);
        String name = optionalText(root, "applicantName");
        String nameEvidence = optionalText(root, "applicantNameEvidence");
        String roleId = optionalText(root, "roleId");
        String roleEvidence = optionalText(root, "roleEvidence");
        if (name == null) {
            nameEvidence = null;
        } else {
            require(nameEvidence != null && normalizedSource.contains(normalize(nameEvidence))
                    && normalize(nameEvidence).contains(normalize(name)));
        }
        if (roleId == null) {
            roleEvidence = null;
        } else {
            require(roles.stream().anyMatch(role -> role.id().equals(roleId))
                    && roleEvidence != null && normalizedSource.contains(normalize(roleEvidence)));
        }
        ObjectNode envelope = mapper.createObjectNode();
        envelope.put("version", PdfApplicantInfo.PROFILE_VERSION);
        envelope.put("status", PdfApplicantInfo.COMPLETED);
        envelope.put("provider", provider);
        envelope.put("model", model);
        envelope.put("applicantName", name);
        envelope.put("applicantNameEvidence", nameEvidence);
        envelope.put("roleId", roleId);
        envelope.put("roleEvidence", roleEvidence);
        envelope.set("profile", profile(root.get("profile")));
        return envelope;
    }

    private JsonNode profile(JsonNode profile) {
        if (profile == null || profile.isNull()) {
            return mapper.nullNode();
        }
        require(profile.isObject());
        ObjectNode normalized = (ObjectNode) profile.deepCopy();
        for (String fact : FACTS) {
            JsonNode node = normalized.get(fact);
            if (node == null || node.isNull()) {
                node = normalized.putObject(fact);
            }
            fillMissing(node, FACT_FIELDS);
        }
        JsonNode careers = normalized.get("careers");
        if (careers == null || careers.isNull()) {
            careers = normalized.putArray("careers");
        }
        require(careers.isArray() && careers.size() <= MAX_CAREERS);
        careers.forEach(career -> fillMissing(career, CAREER_FIELDS));
        return normalized;
    }

    private void fillMissing(JsonNode node, List<String> fields) {
        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            fields.stream().filter(field -> !object.has(field)).forEach(object::putNull);
        }
    }

    private String optionalText(JsonNode root, String field) {
        JsonNode value = root.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        require(value.isString());
        String text = value.asText();
        return text.isBlank() ? null : text;
    }

    private String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).replaceAll("(?U)\\s+", " ").trim();
    }

    private void require(boolean valid) {
        if (!valid) {
            throw invalid();
        }
    }

    private PdfAiFailure invalid() {
        return new PdfAiFailure(INVALID_MODEL_OUTPUT, false);
    }
}
