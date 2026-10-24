package art.yesulin.pdfreview.domain;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public final class PdfReviewAnalyzer {

    private static final int EVIDENCE_VALUE_LENGTH = 60;
    private static final Set<String> STRONG_ROLE_LABELS = Set.of("지원배역", "희망배역", "지원분야");
    private static final String WEAK_ROLE_LABEL = "배역";
    private static final Set<String> NAME_LABELS = Set.of("성명", "이름");
    private static final Set<String> LABELS_ALLOWED_AFTER_SPACE = Set.of("지원배역", "희망배역", "지원분야", "성명");
    private static final List<String> OTHER_LABELS = List.of(
            "생년월일", "생일", "나이", "성별", "연락처", "전화번호", "휴대폰", "휴대전화", "핸드폰", "이메일", "주소",
            "키", "신장", "몸무게", "체중", "학력", "경력", "출연경력", "특기", "소속", "사진", "비고", "자기소개",
            "지원동기", "신체사항", "병역", "국적", "학교", "전공", "링크", "연도", "작품명"
    );
    private static final Pattern LABEL = labelPattern();
    private static final Pattern DECORATION_ONLY = Pattern.compile("^[\\s•·▪■□◆◇○●*\\-\\[\\](]*(?:\\d+[.)]\\s*)?$");
    private static final Pattern LEADING_SEPARATORS = Pattern.compile("^[\\s:：|｜]+");
    private static final Pattern CELL_SEPARATOR = Pattern.compile("[|｜\\t]");
    private static final Pattern TRAILING_PUNCTUATION = Pattern.compile("[,;，、\\s]+$");
    private static final Pattern VALID_NAME = Pattern.compile("^[\\p{L}\\p{M}][\\p{L}\\p{M} ·.'\\-]{0,29}$");
    private static final Pattern LINE_BREAK = Pattern.compile("\\R");
    private static final Pattern INVISIBLE = Pattern.compile("[\\u200B\\uFEFF]");
    private static final Pattern UNICODE_SPACES = Pattern.compile("[\\p{Zs}]+");

    private PdfReviewAnalyzer() {
    }

    public static PdfReviewAnalysis analyze(String text, List<PdfReviewRole> roles) {
        if (text == null || text.isBlank()) {
            return new PdfReviewAnalysis(null, null, PdfReviewMatchStatus.NEEDS_CHECK,
                    "추출된 텍스트가 없어 지원 배역을 확인하지 못했습니다.");
        }
        List<Labeled> found = scan(lines(text));
        String applicantName = applicantName(found);
        return matchRole(found, roles, applicantName);
    }

    private static PdfReviewAnalysis matchRole(List<Labeled> found, List<PdfReviewRole> roles,
                                               String applicantName) {
        List<Labeled> candidates = roleCandidates(found);
        if (candidates.isEmpty()) {
            return needsCheck(applicantName, "지원 배역 레이블(지원배역·희망배역·지원분야·배역)을 찾지 못했습니다.");
        }
        if (candidates.stream().anyMatch(labeled -> labeled.value().isEmpty())) {
            return needsCheck(applicantName, "지원 배역 레이블 뒤에 구분되는 값이 없는 곳이 있습니다.");
        }
        Set<String> values = candidates.stream()
                .map(Labeled::value)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (values.size() > 1) {
            return needsCheck(applicantName, "지원 배역 값이 여러 개입니다: "
                    + values.stream().map(PdfReviewAnalyzer::quote).collect(Collectors.joining(", ")));
        }
        String value = values.iterator().next();
        List<PdfReviewRole> sameName = roles.stream().filter(role -> role.getName().equals(value)).toList();
        if (sameName.size() != 1) {
            return needsCheck(applicantName, "지원 배역 " + quote(value) + "와(과) 정확히 일치하는 배역이 없습니다.");
        }
        return new PdfReviewAnalysis(applicantName, sameName.get(0).getId(), PdfReviewMatchStatus.MATCHED,
                "지원 배역 " + quote(value) + "와(과) 배역 이름이 정확히 일치합니다.");
    }

    private static List<Labeled> roleCandidates(List<Labeled> found) {
        List<Labeled> strong = found.stream()
                .filter(labeled -> STRONG_ROLE_LABELS.contains(labeled.label()))
                .toList();
        if (!strong.isEmpty()) {
            return strong;
        }
        return found.stream().filter(labeled -> WEAK_ROLE_LABEL.equals(labeled.label())).toList();
    }

    private static PdfReviewAnalysis needsCheck(String applicantName, String evidence) {
        return new PdfReviewAnalysis(applicantName, null, PdfReviewMatchStatus.NEEDS_CHECK, evidence);
    }

    private static String applicantName(List<Labeled> found) {
        Set<String> names = found.stream()
                .filter(labeled -> NAME_LABELS.contains(labeled.label()))
                .map(Labeled::value)
                .filter(value -> VALID_NAME.matcher(value).matches())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return names.size() == 1 ? names.iterator().next() : null;
    }

    private static List<Labeled> scan(List<String> lines) {
        List<Labeled> found = new ArrayList<>();
        for (int index = 0; index < lines.size(); index++) {
            String line = lines.get(index);
            List<LabelMatch> matches = labelMatches(line);
            for (int position = 0; position < matches.size(); position++) {
                LabelMatch match = matches.get(position);
                if (!isTarget(match.label()) || !startsCell(line, match)) {
                    continue;
                }
                int regionEnd = position + 1 < matches.size() ? matches.get(position + 1).start() : line.length();
                String value = firstCell(line.substring(match.end(), regionEnd));
                if (value.isEmpty() && isAloneOnLine(line, matches, match)) {
                    value = nextLineValue(lines, index + 1);
                }
                found.add(new Labeled(match.label(), value));
            }
        }
        return found;
    }

    private static String nextLineValue(List<String> lines, int index) {
        if (index >= lines.size()) {
            return "";
        }
        String next = lines.get(index);
        List<LabelMatch> matches = labelMatches(next);
        int end = matches.isEmpty() ? next.length() : matches.get(0).start();
        return firstCell(next.substring(0, end));
    }

    private static boolean isTarget(String label) {
        return STRONG_ROLE_LABELS.contains(label) || WEAK_ROLE_LABEL.equals(label) || NAME_LABELS.contains(label);
    }

    private static boolean isAloneOnLine(String line, List<LabelMatch> matches, LabelMatch match) {
        return matches.size() == 1 && DECORATION_ONLY.matcher(line.substring(0, match.start())).matches();
    }

    private static boolean startsCell(String line, LabelMatch match) {
        String prefix = line.substring(0, match.start());
        if (DECORATION_ONLY.matcher(prefix).matches()) {
            return true;
        }
        String trimmed = prefix.stripTrailing();
        if (prefix.endsWith("\t") || trimmed.endsWith("|") || trimmed.endsWith("｜")) {
            return true;
        }
        String following = line.substring(match.end()).stripLeading();
        return LABELS_ALLOWED_AFTER_SPACE.contains(match.label())
                && prefix.endsWith(" ")
                && (following.startsWith(":") || following.startsWith("："));
    }

    private static String firstCell(String raw) {
        String stripped = LEADING_SEPARATORS.matcher(raw).replaceFirst("");
        Matcher separator = CELL_SEPARATOR.matcher(stripped);
        String cell = separator.find() ? stripped.substring(0, separator.start()) : stripped;
        return PdfReviewText.normalize(TRAILING_PUNCTUATION.matcher(cell).replaceFirst(""));
    }

    private static List<LabelMatch> labelMatches(String line) {
        List<LabelMatch> matches = new ArrayList<>();
        Matcher matcher = LABEL.matcher(line);
        while (matcher.find()) {
            matches.add(new LabelMatch(matcher.group(1).replaceAll("\\s+", ""), matcher.start(1), matcher.end(1)));
        }
        return matches;
    }

    private static List<String> lines(String text) {
        return LINE_BREAK.splitAsStream(Normalizer.normalize(text, Normalizer.Form.NFC))
                .map(line -> INVISIBLE.matcher(line).replaceAll(""))
                .map(line -> UNICODE_SPACES.matcher(line).replaceAll(" "))
                .map(String::strip)
                .toList();
    }

    private static String quote(String value) {
        return "\"" + PdfReviewText.abbreviate(value, EVIDENCE_VALUE_LENGTH) + "\"";
    }

    private static Pattern labelPattern() {
        List<String> labels = new ArrayList<>(STRONG_ROLE_LABELS);
        labels.add(WEAK_ROLE_LABEL);
        labels.addAll(NAME_LABELS);
        labels.addAll(OTHER_LABELS);
        String alternation = labels.stream()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .map(PdfReviewAnalyzer::spaced)
                .collect(Collectors.joining("|"));
        return Pattern.compile("(?<![\\p{L}\\p{N}])(" + alternation + ")(?=[\\s:：|｜]|$)");
    }

    private static String spaced(String label) {
        return label.codePoints()
                .mapToObj(codePoint -> Pattern.quote(Character.toString(codePoint)))
                .collect(Collectors.joining("\\s*"));
    }

    private record LabelMatch(String label, int start, int end) {
    }

    private record Labeled(String label, String value) {
    }
}
