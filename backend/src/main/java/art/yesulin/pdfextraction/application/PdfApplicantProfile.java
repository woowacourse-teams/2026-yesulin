package art.yesulin.pdfextraction.application;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF_EXTRACTION_RESULT;

import art.yesulin.global.exception.BusinessException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import tools.jackson.databind.JsonNode;

/** 원문 구절에 근거한 전사 값. 나이·외모·능력을 추정하지 않는다. */
public record PdfApplicantProfile(Fact birthDate, Fact age, Fact height, Fact education, List<Career> careers) {

    public record Fact(String value, String evidence) {
    }

    public record Career(String title, String venue, String part, String genre, String period,
                         String company, String evidence) {
    }

    public static PdfApplicantProfile parse(JsonNode node) {
        if (node.isMissingNode() || node.isNull()) {
            return null;
        }
        fields(node, Set.of("birthDate", "age", "height", "education", "careers"));
        JsonNode rows = node.path("careers");
        require(rows.isArray() && rows.size() <= 50);
        List<Career> careers = new ArrayList<>();
        for (JsonNode row : rows) {
            fields(row, Set.of("title", "venue", "part", "genre", "period", "company", "evidence"));
            String evidence = text(row.path("evidence"), 1000);
            String title = text(row.path("title"), 300);
            require(title != null && evidence != null);
            careers.add(new Career(title, text(row.path("venue"), 300), text(row.path("part"), 300),
                    text(row.path("genre"), 300), text(row.path("period"), 300),
                    text(row.path("company"), 300), evidence));
        }
        return new PdfApplicantProfile(fact(node.path("birthDate")), fact(node.path("age")),
                fact(node.path("height")), fact(node.path("education")), List.copyOf(careers));
    }

    /** 배우 프로필 가져오기에서 제안할 사실이나 경력이 하나라도 있는지. */
    public boolean hasValue() {
        return !careers.isEmpty() || Stream.of(birthDate, age, height, education)
                .anyMatch(fact -> fact != null && fact.value() != null);
    }

    public void validateEvidence(String source) {
        String normalizedSource = normalize(source);
        for (Fact fact : List.of(birthDate, age, height, education)) {
            if (fact.value() != null) {
                require(normalizedSource.contains(normalize(fact.evidence())));
                contained(fact.value(), fact.evidence());
            }
        }
        for (Career career : careers) {
            require(normalizedSource.contains(normalize(career.evidence())));
            contained(career.title(), career.evidence());
            contained(career.venue(), career.evidence());
            contained(career.part(), career.evidence());
            contained(career.genre(), career.evidence());
            contained(career.period(), career.evidence());
            contained(career.company(), career.evidence());
        }
    }

    private static void contained(String value, String evidence) {
        require(value == null || normalize(evidence).contains(normalize(value)));
    }

    private static Fact fact(JsonNode node) {
        fields(node, Set.of("value", "evidence"));
        String value = text(node.path("value"), 300);
        String evidence = text(node.path("evidence"), 1000);
        require((value == null) == (evidence == null));
        return new Fact(value, evidence);
    }

    private static void fields(JsonNode node, Set<String> fields) {
        require(node.isObject() && node.size() == fields.size());
        node.propertyNames().forEach(name -> require(fields.contains(name)));
    }

    private static String text(JsonNode node, int limit) {
        if (node.isNull()) {
            return null;
        }
        require(node.isString());
        String value = node.asText();
        require(!value.isBlank() && value.codePointCount(0, value.length()) <= limit);
        require(value.codePoints().noneMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r' && c != '\t'));
        return value;
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).replaceAll("(?U)\\s+", " ").trim();
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new BusinessException(INVALID_PDF_EXTRACTION_RESULT, "프로필 정보의 형식 또는 원문 근거가 올바르지 않습니다.");
        }
    }
}
