package art.yesulin.infrastructure.seed;

import static art.yesulin.infrastructure.seed.SeedJson.bool;
import static art.yesulin.infrastructure.seed.SeedJson.elements;
import static art.yesulin.infrastructure.seed.SeedJson.integer;
import static art.yesulin.infrastructure.seed.SeedJson.invalid;
import static art.yesulin.infrastructure.seed.SeedJson.localDate;
import static art.yesulin.infrastructure.seed.SeedJson.nullableInteger;
import static art.yesulin.infrastructure.seed.SeedJson.nullableText;
import static art.yesulin.infrastructure.seed.SeedJson.offsetDateTime;
import static art.yesulin.infrastructure.seed.SeedJson.requireArray;
import static art.yesulin.infrastructure.seed.SeedJson.requireObject;
import static art.yesulin.infrastructure.seed.SeedJson.text;
import static art.yesulin.infrastructure.seed.SeedJson.validateRemoteUrl;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class SeedFileReader {

    private static final Set<String> POSTING_STATUSES = Set.of("UPCOMING", "OPEN", "CLOSED");
    private static final Set<String> GENDERS = Set.of("ANY", "MALE", "FEMALE");

    private final ObjectMapper objectMapper;

    public SeedFileReader(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public SeedData read(Path path) {
        try {
            return parse(objectMapper.readTree(Files.readString(path)));
        } catch (IOException | JacksonException exception) {
            throw new SeedValidationException("시드 JSON을 읽거나 파싱할 수 없습니다: " + path, exception);
        }
    }

    private SeedData parse(JsonNode root) {
        requireObject(root, "root");
        requireArray(root, "applications");
        requireArray(root, "careers");
        requireArray(root, "photos");
        requireArray(root, "reviews");
        requireArray(root, "roundClosures");
        requireArray(root, "performanceRoleTemplates");
        requireArray(root, "rounds");
        requireArray(root, "applicationFieldOptions");
        requireObject(root.path("applicantSide"), "applicantSide");

        List<JsonNode> producers = elements(requireArray(root, "producers"));
        if (producers.size() != 1) {
            throw invalid("producers는 정확히 1건이어야 합니다.");
        }
        SeedData.Producer producer = producer(producers.getFirst());
        List<SeedData.Performance> performances = elements(requireArray(root, "performances"))
                .stream().map(this::performance).toList();
        List<SeedData.Posting> postings = elements(requireArray(root, "postings"))
                .stream().map(this::posting).toList();
        List<SeedData.Role> roles = elements(requireArray(root, "roles"))
                .stream().map(this::role).toList();
        List<SeedData.PostingField> fields = elements(requireArray(root, "applicationFields"))
                .stream().map(this::postingField).toList();
        validateRelationships(producer, performances, postings, roles, fields);
        return new SeedData(producer, performances, postings, roles, fields);
    }

    private SeedData.Producer producer(JsonNode node) {
        requireObject(node, "producer");
        if (!"VERIFIED".equals(text(node, "verificationStatus"))) {
            throw invalid("시드 공연사는 VERIFIED 상태여야 합니다.");
        }
        OffsetDateTime verifiedAt = offsetDateTime(node, "verifiedAt");
        return new SeedData.Producer(
                text(node, "companyName"), text(node, "contactName"),
                text(node, "email").toLowerCase(), text(node, "businessNumber"),
                text(node, "representativeName"),
                verifiedAt.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime());
    }

    private SeedData.Performance performance(JsonNode node) {
        requireObject(node, "performance");
        String posterUrl = nullableText(node, "posterUrl");
        validateRemoteUrl(posterUrl, "performances.posterUrl");
        return new SeedData.Performance(
                text(node, "id"), text(node, "title"), nullableText(node, "venue"),
                posterUrl, text(node, "producer"));
    }

    private SeedData.Posting posting(JsonNode node) {
        requireObject(node, "posting");
        String status = text(node, "status");
        if (!POSTING_STATUSES.contains(status)) {
            throw invalid("지원하지 않는 공고 상태입니다: " + status);
        }
        LocalDate start = localDate(node, "recruitmentStart");
        LocalDate end = localDate(node, "recruitmentEnd");
        if (end.isBefore(start)) {
            throw invalid("공고 모집 종료일이 시작일보다 빠릅니다: " + text(node, "id"));
        }
        return new SeedData.Posting(
                text(node, "id"), text(node, "performanceId"), text(node, "title"), status,
                start, end, nullableText(node, "applicationGuide"));
    }

    private SeedData.Role role(JsonNode node) {
        requireObject(node, "role");
        String gender = text(node, "gender");
        if (!GENDERS.contains(gender)) {
            throw invalid("지원하지 않는 배역 성별 조건입니다: " + gender);
        }
        Integer quota = nullableInteger(node, "quota");
        Integer ageMin = nullableInteger(node, "ageMin");
        Integer ageMax = nullableInteger(node, "ageMax");
        if (quota != null && quota < 1) {
            throw invalid("배역 모집 인원은 1명 이상이어야 합니다.");
        }
        if (ageMin != null && ageMax != null && ageMin > ageMax) {
            throw invalid("배역 최소 나이가 최대 나이보다 큽니다.");
        }
        return new SeedData.Role(
                text(node, "id"), text(node, "postingId"), text(node, "performanceId"),
                text(node, "name"), nullableText(node, "description"), quota, gender,
                ageMin, ageMax);
    }

    private SeedData.PostingField postingField(JsonNode node) {
        requireObject(node, "applicationField");
        String sourceId = text(node, "id");
        String key = nullableText(node, "key");
        if (key == null || key.isBlank()) {
            key = sourceId;
        }
        JsonNode config = node.path("config");
        if (!config.isMissingNode() && !config.isNull() && !config.isObject()) {
            throw invalid("applicationFields.config는 객체여야 합니다.");
        }
        return new SeedData.PostingField(
                text(node, "postingId"), sourceId, key,
                text(node, "label"), bool(node, "required"), bool(node, "custom"),
                text(node, "section"), text(node, "inputType"), integer(node, "order"),
                config.isMissingNode() || config.isNull() ? "{}" : config.toString());
    }

    private void validateRelationships(
            SeedData.Producer producer,
            List<SeedData.Performance> performances,
            List<SeedData.Posting> postings,
            List<SeedData.Role> roles,
            List<SeedData.PostingField> fields) {
        Set<String> performanceIds = unique(
                performances.stream().map(SeedData.Performance::sourceId).toList(), "공연");
        performances.forEach(performance -> {
            if (!producer.companyName().equals(performance.producerName())) {
                throw invalid("공연의 공연사 이름이 producer와 다릅니다: " + performance.sourceId());
            }
        });
        Set<String> postingIds = unique(
                postings.stream().map(SeedData.Posting::sourceId).toList(), "공고");
        postings.forEach(posting -> requireReference(
                performanceIds, posting.performanceSourceId(), "공고의 공연"));
        unique(roles.stream().map(SeedData.Role::sourceId).toList(), "배역");
        roles.forEach(role -> {
            requireReference(postingIds, role.postingSourceId(), "배역의 공고");
            requireReference(performanceIds, role.performanceSourceId(), "배역의 공연");
            SeedData.Posting posting = postings.stream()
                    .filter(candidate -> candidate.sourceId().equals(role.postingSourceId()))
                    .findFirst().orElseThrow();
            if (!posting.performanceSourceId().equals(role.performanceSourceId())) {
                throw invalid("배역의 공연과 공고의 공연이 다릅니다: " + role.sourceId());
            }
        });
        unique(fields.stream().map(field -> field.postingSourceId() + ":" + field.key()).toList(),
                "공고 입력 필드");
        fields.forEach(field -> requireReference(
                postingIds, field.postingSourceId(), "입력 필드의 공고"));
    }

    private Set<String> unique(List<String> values, String label) {
        Set<String> uniqueValues = new HashSet<>(values);
        if (uniqueValues.size() != values.size()) {
            throw invalid(label + " 원본 ID가 중복됩니다.");
        }
        return uniqueValues;
    }

    private void requireReference(Set<String> ids, String id, String label) {
        if (!ids.contains(id)) {
            throw invalid(label + " 참조가 없습니다: " + id);
        }
    }

}
