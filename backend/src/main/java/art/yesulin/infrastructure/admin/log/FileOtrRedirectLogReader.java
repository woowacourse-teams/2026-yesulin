package art.yesulin.infrastructure.admin.log;

import art.yesulin.application.admin.log.LogEntry;
import art.yesulin.application.admin.log.OtrRedirectCount;
import art.yesulin.application.admin.log.OtrRedirectLogReader;
import art.yesulin.application.admin.log.OtrRedirectLogSummary;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 최근 줄 수에 의존하지 않고 현재 파일과 선택 기간의 압축 로그를 스트림으로 집계한다. */
@Component
@RequiredArgsConstructor
public class FileOtrRedirectLogReader implements OtrRedirectLogReader {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final long MAX_SCAN_CHARS = 64L * 1024 * 1024;
    private static final int MAX_FILES = 200;

    private final LogFileProperties properties;
    private final LogLineParser parser;

    @Override
    public OtrRedirectLogSummary summarize(LocalDate startDate, LocalDate endDate) {
        if (properties.name() == null || properties.name().isBlank()) {
            return new OtrRedirectLogSummary(List.of(), false, false);
        }
        Path current = Path.of(properties.name()).toAbsolutePath();
        Scan scan = new Scan(startDate, endDate);
        try {
            List<LogPart> parts = findParts(current, startDate, endDate);
            scan.truncated = parts.size() > MAX_FILES;
            for (LogPart part : parts.stream().limit(MAX_FILES).toList()) {
                if (scan.scanned >= MAX_SCAN_CHARS) {
                    scan.truncated = true;
                    break;
                }
                try {
                    scanFile(part, scan);
                } catch (IOException exception) {
                    scan.truncated = true;
                }
            }
        } catch (IOException exception) {
            scan.truncated = true;
        }
        List<OtrRedirectCount> links = scan.counts.values().stream()
                .sorted(Comparator.comparingLong(OtrRedirectCount::clicks).reversed()
                        .thenComparing(OtrRedirectCount::otrId))
                .toList();
        return new OtrRedirectLogSummary(links, scan.available, scan.truncated);
    }

    private List<LogPart> findParts(Path current, LocalDate startDate, LocalDate endDate) throws IOException {
        List<LogPart> parts = new ArrayList<>();
        if (Files.isReadable(current)) {
            parts.add(new LogPart(current, endDate, Integer.MAX_VALUE, false));
        }
        Path directory = current.getParent();
        if (!Files.isDirectory(directory)) {
            return parts;
        }
        Pattern pattern = Pattern.compile(Pattern.quote(current.getFileName().toString())
                + "\\.(\\d{4}-\\d{2}-\\d{2})\\.(\\d{1,9})\\.gz");
        try (DirectoryStream<Path> files = Files.newDirectoryStream(directory)) {
            for (Path file : files) {
                Matcher matcher = pattern.matcher(file.getFileName().toString());
                if (matcher.matches()) {
                    addArchive(parts, file, matcher, startDate, endDate);
                }
            }
        }
        parts.sort(Comparator.comparing(LogPart::date).thenComparingInt(LogPart::index).reversed());
        return parts;
    }

    private void addArchive(
            List<LogPart> parts, Path file, Matcher matcher, LocalDate startDate, LocalDate endDate
    ) {
        try {
            LocalDate date = LocalDate.parse(matcher.group(1));
            if (!date.isBefore(startDate) && !date.isAfter(endDate)) {
                parts.add(new LogPart(file, date, Integer.parseInt(matcher.group(2)), true));
            }
        } catch (DateTimeParseException exception) {
            // 날짜별 rolling 파일이 아닌 항목은 집계하지 않는다.
        }
    }

    private void scanFile(LogPart part, Scan scan) throws IOException {
        try (InputStream file = Files.newInputStream(part.path());
                InputStream content = part.compressed() ? new GZIPInputStream(file) : file;
                BufferedReader reader = new BufferedReader(new InputStreamReader(content, StandardCharsets.UTF_8))) {
            scan.available = true;
            String line;
            while ((line = reader.readLine()) != null) {
                scan.scanned += line.length() + 1L;
                if (scan.scanned > MAX_SCAN_CHARS) {
                    scan.truncated = true;
                    return;
                }
                if (line.contains("HTTP_REQUEST") && line.contains("otrId")) {
                    scan.accept(parser.parse(line));
                }
            }
        }
    }

    private record LogPart(Path path, LocalDate date, int index, boolean compressed) {
    }

    private static class Scan {

        private final LocalDate startDate;
        private final LocalDate endDate;
        private final Map<String, OtrRedirectCount> counts = new HashMap<>();
        private long scanned;
        private boolean available;
        private boolean truncated;

        private Scan(LocalDate startDate, LocalDate endDate) {
            this.startDate = startDate;
            this.endDate = endDate;
        }

        private void accept(LogEntry entry) {
            Map<String, Object> attributes = entry.attributes();
            if (!"HTTP_REQUEST".equals(attributes.get("event")) || !"GET".equals(attributes.get("method"))
                    || !"/api/v1/otr".equals(attributes.get("endpoint"))
                    || !(attributes.get("status") instanceof Number status) || status.intValue() != 302
                    || !(attributes.get("otrId") instanceof String otrId) || !otrId.matches("[0-9]{1,30}")
                    || entry.timestamp() == null) {
                return;
            }
            LocalDate date = LocalDate.ofInstant(entry.timestamp(), KOREA);
            if (date.isBefore(startDate) || date.isAfter(endDate)) {
                return;
            }
            OtrRedirectCount previous = counts.get(otrId);
            Instant lastClickedAt = entry.timestamp();
            if (previous != null && previous.lastClickedAt().isAfter(lastClickedAt)) {
                lastClickedAt = previous.lastClickedAt();
            }
            counts.put(otrId, new OtrRedirectCount(otrId, previous == null ? 1 : previous.clicks() + 1, lastClickedAt));
        }
    }
}
