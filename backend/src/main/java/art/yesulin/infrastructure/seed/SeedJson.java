package art.yesulin.infrastructure.seed;

import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.StreamSupport;
import tools.jackson.databind.JsonNode;

final class SeedJson {

    private SeedJson() {
    }

    static JsonNode requireArray(JsonNode parent, String field) {
        JsonNode value = parent.path(field);
        if (!value.isArray()) {
            throw invalid(field, "TYPE_ARRAY", field + "는 배열이어야 합니다.");
        }
        return value;
    }

    static void requireObject(JsonNode node, String label) {
        if (!node.isObject()) {
            throw invalid(label + "는 객체여야 합니다.");
        }
    }

    static String text(JsonNode node, String field) {
        String value = nullableText(node, field);
        if (value == null || value.isBlank()) {
            throw invalid(field, "REQUIRED", field + "는 비어 있을 수 없습니다.");
        }
        return value;
    }

    static String nullableText(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (!value.isString()) {
            throw invalid(field, "TYPE_STRING", field + "는 문자열이어야 합니다.");
        }
        return value.stringValue();
    }

    static boolean bool(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isBoolean()) {
            throw invalid(field, "TYPE_BOOLEAN", field + "는 boolean이어야 합니다.");
        }
        return value.booleanValue();
    }

    static int integer(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (!value.isIntegralNumber()) {
            throw invalid(field, "TYPE_INTEGER", field + "는 정수여야 합니다.");
        }
        return value.intValue();
    }

    static Integer nullableInteger(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() ? null : integer(node, field);
    }

    static LocalDate localDate(JsonNode node, String field) {
        try {
            return LocalDate.parse(text(node, field));
        } catch (RuntimeException exception) {
            throw new SeedValidationException(field + " 날짜가 올바르지 않습니다.", exception);
        }
    }

    static OffsetDateTime offsetDateTime(JsonNode node, String field) {
        try {
            return OffsetDateTime.parse(text(node, field));
        } catch (RuntimeException exception) {
            throw new SeedValidationException(field + " 시각이 올바르지 않습니다.", exception);
        }
    }

    static void validateRemoteUrl(String value, String field) {
        if (value == null) {
            return;
        }
        URI uri;
        try {
            uri = URI.create(value);
        } catch (IllegalArgumentException exception) {
            throw new SeedValidationException(field + " URL이 올바르지 않습니다.", exception);
        }
        if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null) {
            throw invalid(field + "는 http(s) 원격 URL이어야 합니다.");
        }
    }

    static List<JsonNode> elements(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false).toList();
    }

    static SeedValidationException invalid(String message) {
        return new SeedValidationException(message);
    }

    static SeedValidationException invalid(String field, String validation, String message) {
        return new SeedValidationException(new SeedDiagnostic(
                "seed-file", "current-record", field, validation, message));
    }
}
