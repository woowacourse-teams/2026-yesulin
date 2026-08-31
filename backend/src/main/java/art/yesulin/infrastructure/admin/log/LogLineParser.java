package art.yesulin.infrastructure.admin.log;

import art.yesulin.application.admin.log.LogEntry;
import art.yesulin.application.admin.log.LogEntryFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** 새 JSON Lines와 배포 전에 남은 일반 문자열 로그를 같은 조회 모델로 변환한다. */
@Component
@RequiredArgsConstructor
public class LogLineParser {

    private static final ZoneId LOG_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter LEGACY_TIMESTAMP_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final Pattern LEGACY_PATTERN = Pattern.compile(
            "^(?<timestamp>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3}) "
                    + "\\[(?<thread>[^]]+)]\\s+(?<level>TRACE|DEBUG|INFO|WARN|ERROR)\\s+"
                    + "(?<logger>\\S+)\\s+\\[requestId=(?<requestId>[^]]*)]\\s+(?<message>.*)$"
    );
    private static final Pattern SIMPLE_LEVEL_PATTERN = Pattern.compile("^(TRACE|DEBUG|INFO|WARN|ERROR)\\b");
    private static final Set<String> COMMON_JSON_FIELDS = Set.of(
            "@timestamp", "timestamp", "@version", "level", "level_value", "logger_name", "logger",
            "thread_name", "thread", "requestId", "message"
    );

    private final ObjectMapper objectMapper;

    public LogEntry parse(String line) {
        if (line.stripLeading().startsWith("{")) {
            LogEntry structured = parseStructured(line);
            if (structured != null) {
                return structured;
            }
        }
        return parseLegacy(line);
    }

    private LogEntry parseStructured(String line) {
        try {
            JsonNode root = objectMapper.readTree(line);
            if (root == null || !root.isObject()) {
                return null;
            }
            Map<String, Object> attributes = objectMapper.treeToValue(
                    root, new TypeReference<LinkedHashMap<String, Object>>() {
                    }
            );
            COMMON_JSON_FIELDS.forEach(attributes::remove);
            return new LogEntry(
                    LogEntryFormat.STRUCTURED,
                    parseStructuredTimestamp(text(root, "@timestamp", "timestamp")),
                    text(root, "level"),
                    text(root, "logger_name", "logger"),
                    text(root, "thread_name", "thread"),
                    emptyToNull(text(root, "requestId")),
                    text(root, "message"),
                    attributes,
                    line
            );
        } catch (JacksonException exception) {
            return null;
        }
    }

    private LogEntry parseLegacy(String line) {
        Matcher matcher = LEGACY_PATTERN.matcher(line);
        if (matcher.matches()) {
            return new LogEntry(
                    LogEntryFormat.LEGACY,
                    parseLegacyTimestamp(matcher.group("timestamp")),
                    matcher.group("level"),
                    matcher.group("logger"),
                    matcher.group("thread"),
                    emptyToNull(matcher.group("requestId")),
                    matcher.group("message"),
                    Map.of(),
                    line
            );
        }
        Matcher levelMatcher = SIMPLE_LEVEL_PATTERN.matcher(line);
        String level = levelMatcher.find() ? levelMatcher.group(1) : null;
        return new LogEntry(
                LogEntryFormat.LEGACY,
                null,
                level,
                null,
                null,
                null,
                line,
                Map.of(),
                line
        );
    }

    private String text(JsonNode root, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode value = root.get(fieldName);
            if (value != null && !value.isNull()) {
                return value.asString();
            }
        }
        return null;
    }

    private Instant parseStructuredTimestamp(String value) {
        if (value == null) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException exception) {
            try {
                return Instant.parse(value);
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
    }

    private Instant parseLegacyTimestamp(String value) {
        try {
            return LocalDateTime.parse(value, LEGACY_TIMESTAMP_FORMATTER).atZone(LOG_ZONE).toInstant();
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() || "-".equals(value) ? null : value;
    }
}
