package art.yesulin.infrastructure.crawler;

import art.yesulin.application.auditionpost.AuditionPostBody;
import art.yesulin.application.auditionpost.AuditionPostSource;
import art.yesulin.application.auditionpost.AuditionPostSourceException;
import art.yesulin.application.auditionpost.SourceFile;
import art.yesulin.application.auditionpost.SourceFileContent;
import art.yesulin.application.auditionpost.SourceFileTooLargeException;
import art.yesulin.application.auditionpost.SourcePost;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.CookieManager;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * OTR(망보드) 공고 상세 한 건을 본문·사진·첨부파일까지 읽는다.
 *
 * <p>본문은 허용 태그만 남기고 인라인 스타일을 버린다. 사진은 OTR 업로드 경로의 https 주소만 옮기고 다른 주소의 사진은
 * 지운다. 첨부파일은 OTR 화면과 같은 순서로 내려받는다. 상세 페이지의 nonce로 다운로드 경로를 받고
 * {@code ?mb_ext=file}로 내려받는다. 서버가 임의 주소에 접속하지 않도록 파일 요청은 OTR 호스트로만 보내고
 * 리다이렉트를 따라가지 않는다.
 */
@Component
public class OtrAuditionPostSource implements AuditionPostSource {

    private static final String SOURCE = "OTR";
    private static final String HOST = "otr.co.kr";
    private static final String ORIGIN = "https://" + HOST;
    private static final String AUDITION_URL = ORIGIN + "/audition/";
    private static final String AJAX_URL = ORIGIN + "/wp-admin/admin-ajax.php";
    private static final String UPLOAD_PATH_PREFIX = "/wp-content/uploads/";
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; YesulinNoticeCrawler/0.1)";
    private static final Pattern NUMERIC_ID = Pattern.compile("[0-9]{1,30}");
    private static final Pattern VID = Pattern.compile("(?:^|&)vid=([0-9]{1,30})(?:&|$)");
    private static final Pattern NONCE = Pattern.compile("mb_options\\[\"nonce2\"\\]\\s*=\\s*\"([^\"]+)\"");
    private static final Pattern FILE_DATA =
            Pattern.compile("sendBoardFileData\\(([0-9]{1,20})\\s*,\\s*'((?:[^'\\\\]|\\\\.)*)'\\)");
    private static final Pattern BOLD_STYLE =
            Pattern.compile("font-weight\\s*:\\s*(bold|bolder|[6-9]00)", Pattern.CASE_INSENSITIVE);
    private static final Pattern FILE_PATH = Pattern.compile("[A-Za-z0-9%+/=_-]{1,2000}");
    private static final DateTimeFormatter POSTED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration PAGE_TIMEOUT = Duration.ofSeconds(15);
    private static final Duration FILE_TIMEOUT = Duration.ofSeconds(60);
    private static final int MAX_PAGE_BYTES = 4 * 1024 * 1024;
    private static final Safelist BODY_SAFELIST = Safelist.relaxed()
            .removeTags("div")
            .removeAttributes("img", "align", "width", "height")
            .removeAttributes("table", "summary", "width")
            .removeAttributes("td", "abbr", "axis", "width")
            .removeAttributes("th", "abbr", "axis", "scope", "width")
            .removeAttributes("col", "span", "width")
            .removeAttributes("colgroup", "span", "width");

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public OtrAuditionPostSource(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER)
                .cookieHandler(new CookieManager())
                .build();
    }

    @Override
    public String getSource() {
        return SOURCE;
    }

    @Override
    public SourcePost fetch(String externalId) {
        if (externalId == null || !NUMERIC_ID.matcher(externalId).matches()) {
            throw new IllegalArgumentException("OTR 공고 번호는 숫자 1~30자여야 합니다.");
        }
        String url = AUDITION_URL + "?vid=" + externalId;
        Document document = fetchPage(url);
        // 원문 HTML을 꺼낼 때 Jsoup이 들여쓰기 공백을 끼워 넣지 않게 한다.
        document.outputSettings().prettyPrint(false);
        verifyCanonical(document, externalId);
        Element titleRow = required(document, "#mb_audition_tr_title", "OTR 공고 상세를 찾을 수 없습니다. 번호를 확인해 주세요.");
        Element title = required(titleRow, "td span[style*='float:left']", "OTR 공고 제목을 찾을 수 없습니다.");
        Element body = required(document, "#mb_audition_tr_content td.content-box", "OTR 공고 본문을 찾을 수 없습니다.");
        List<SourceFile> images = new ArrayList<>();
        String bodyHtml = cleanBody(body.html(), url, images);
        return new SourcePost(
                externalId,
                url,
                text(document, "#mb_audition_tr_category1 td"),
                title.text(),
                text(document, "#mb_audition_tr_ext2 td"),
                text(document, "#mb_audition_tr_edate td"),
                authorName(document),
                postedAt(titleRow),
                bodyHtml,
                tags(document),
                images,
                attachments(document)
        );
    }

    @Override
    public SourceFileContent open(SourceFile file, long maxBytes) {
        URI uri = requireOtrUri(file.url());
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(FILE_TIMEOUT)
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();
        HttpResponse<InputStream> response = send(request, HttpResponse.BodyHandlers.ofInputStream(), file.filename());
        InputStream stream = response.body();
        try {
            if (response.statusCode() != 200) {
                throw new AuditionPostSourceException(
                        "OTR 파일 '%s'을(를) 받지 못했습니다. HTTP %d".formatted(file.filename(), response.statusCode())
                );
            }
            String contentType = response.headers().firstValue("Content-Type").orElse("");
            OptionalLong length = response.headers().firstValueAsLong("Content-Length");
            if (length.isPresent()) {
                return streamed(file, maxBytes, stream, contentType, length.getAsLong());
            }
            return buffered(file, maxBytes, stream, contentType);
        } catch (RuntimeException | IOException exception) {
            closeAfterFailure(stream, exception);
            if (exception instanceof AuditionPostSourceException sourceException) {
                throw sourceException;
            }
            throw new AuditionPostSourceException("OTR 파일 '%s'을(를) 읽지 못했습니다.".formatted(file.filename()), exception);
        }
    }

    private SourceFileContent streamed(SourceFile file, long maxBytes, InputStream stream, String type, long length) {
        if (length > maxBytes) {
            throw new SourceFileTooLargeException("OTR 파일 '%s'이(가) 너무 큽니다.".formatted(file.filename()));
        }
        if (length <= 0) {
            throw new AuditionPostSourceException("OTR 파일 '%s'이(가) 비어 있습니다.".formatted(file.filename()));
        }
        return new SourceFileContent(type, length, stream);
    }

    /** 길이를 알려 주지 않는 응답만 상한까지 메모리로 읽는다. */
    private SourceFileContent buffered(SourceFile file, long maxBytes, InputStream stream, String type)
            throws IOException {
        byte[] bytes = stream.readNBytes(Math.toIntExact(Math.min(maxBytes + 1, Integer.MAX_VALUE - 8)));
        stream.close();
        if (bytes.length > maxBytes) {
            throw new SourceFileTooLargeException("OTR 파일 '%s'이(가) 너무 큽니다.".formatted(file.filename()));
        }
        if (bytes.length == 0) {
            throw new AuditionPostSourceException("OTR 파일 '%s'이(가) 비어 있습니다.".formatted(file.filename()));
        }
        return new SourceFileContent(type, bytes.length, new ByteArrayInputStream(bytes));
    }

    private Document fetchPage(String url) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(PAGE_TIMEOUT)
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();
        HttpResponse<InputStream> response = send(request, HttpResponse.BodyHandlers.ofInputStream(), "상세 페이지");
        try (InputStream stream = response.body()) {
            if (response.statusCode() != 200) {
                throw new AuditionPostSourceException("OTR 공고 페이지를 읽지 못했습니다. HTTP " + response.statusCode());
            }
            byte[] bytes = stream.readNBytes(MAX_PAGE_BYTES + 1);
            if (bytes.length > MAX_PAGE_BYTES) {
                throw new AuditionPostSourceException("OTR 공고 페이지가 너무 큽니다.");
            }
            return Jsoup.parse(new ByteArrayInputStream(bytes), null, url);
        } catch (IOException exception) {
            throw new AuditionPostSourceException("OTR 공고 페이지를 읽지 못했습니다.", exception);
        }
    }

    private <T> HttpResponse<T> send(HttpRequest request, HttpResponse.BodyHandler<T> handler, String target) {
        try {
            return httpClient.send(request, handler);
        } catch (IOException exception) {
            throw new AuditionPostSourceException("OTR에 연결하지 못했습니다(%s).".formatted(target), exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AuditionPostSourceException("OTR 요청이 중단됐습니다(%s).".formatted(target), exception);
        }
    }

    private void verifyCanonical(Document document, String externalId) {
        Element canonical = required(document, "link[rel=canonical][href]", "OTR 공고 상세를 찾을 수 없습니다. 번호를 확인해 주세요.");
        URI uri = URI.create(canonical.absUrl("href"));
        Matcher matcher = uri.getRawQuery() == null ? null : VID.matcher(uri.getRawQuery());
        if (matcher == null || !matcher.find() || !externalId.equals(matcher.group(1))) {
            throw new AuditionPostSourceException("OTR 공고 %s를 찾을 수 없습니다. 번호를 확인해 주세요.".formatted(externalId));
        }
    }

    /**
     * 허용 태그만 남긴 뒤 OTR 사진은 자리 표시로 바꾸고 나머지 사진은 지운다. 같은 사진이 두 번 나오면 한 번만 옮긴다.
     * OTR로 가는 링크는 글자만 남기고, 다른 링크는 새 창으로 열며 검색 엔진과 상대 사이트에 우리 페이지를 넘기지 않는다.
     */
    private String cleanBody(String rawHtml, String baseUrl, List<SourceFile> images) {
        Document.OutputSettings output = new Document.OutputSettings().prettyPrint(false);
        Document raw = Jsoup.parseBodyFragment(rawHtml, baseUrl);
        raw.outputSettings(output);
        keepBoldEmphasis(raw);
        String cleaned = Jsoup.clean(raw.body().html(), baseUrl, BODY_SAFELIST, output);
        Document body = Jsoup.parseBodyFragment(cleaned, baseUrl);
        body.outputSettings(output);
        Map<String, Integer> indexes = new LinkedHashMap<>();
        for (Element image : body.select("img")) {
            String src = image.absUrl("src");
            if (!isOtrUpload(src)) {
                image.remove();
                continue;
            }
            int index = indexes.computeIfAbsent(src, ignored -> {
                images.add(new SourceFile(filenameOf(src), src));
                return images.size() - 1;
            });
            image.attr("src", AuditionPostBody.placeholder(index));
        }
        for (Element link : body.select("a[href]")) {
            if (isOtrHost(link.absUrl("href"))) {
                // 우리 공고로 게시하므로 OTR 페이지로 가는 링크는 글자만 남긴다.
                link.unwrap();
                continue;
            }
            link.attr("target", "_blank");
            link.attr("rel", "noopener noreferrer nofollow");
        }
        return body.body().html();
    }

    /** 원문은 굵게를 인라인 스타일로 주는 경우가 많다. 스타일을 버리기 전에 굵게만 {@code strong}으로 옮긴다. */
    private void keepBoldEmphasis(Document raw) {
        for (Element element : raw.select("[style]")) {
            if (!BOLD_STYLE.matcher(element.attr("style")).find()) {
                continue;
            }
            if ("span".equals(element.normalName())) {
                element.tagName("strong");
            } else {
                element.html("<strong>" + element.html() + "</strong>");
            }
        }
    }

    private List<SourceFile> attachments(Document document) {
        List<Element> links = document.select("#mb_audition_tr_file_download a.file-download[onclick]");
        if (links.isEmpty()) {
            return List.of();
        }
        String nonce = nonce(document);
        List<SourceFile> files = new ArrayList<>();
        for (Element link : links) {
            Matcher matcher = FILE_DATA.matcher(link.attr("onclick"));
            if (!matcher.find()) {
                throw new AuditionPostSourceException("OTR 첨부파일 정보를 읽지 못했습니다.");
            }
            String filename = unescapeJavaScript(matcher.group(2));
            files.add(new SourceFile(filename, downloadUrl(nonce, matcher.group(1), filename)));
        }
        return files;
    }

    /** 망보드 화면이 첨부를 받을 때와 같은 요청이다. 응답의 경로 값을 그대로 다운로드 주소에 붙인다. */
    private String downloadUrl(String nonce, String filePid, String filename) {
        String form = "mode=file&board_action=file_download&board_name=audition"
                + "&file_pid=" + filePid
                + "&file_name=" + URLEncoder.encode(filename, StandardCharsets.UTF_8)
                + "&" + nonce
                + "&action=mb_board&admin_page=false&hybrid_app=";
        HttpRequest request = HttpRequest.newBuilder(URI.create(AJAX_URL))
                .timeout(PAGE_TIMEOUT)
                .header("User-Agent", USER_AGENT)
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .header("X-Requested-With", "XMLHttpRequest")
                .POST(HttpRequest.BodyPublishers.ofString(form, StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> response = send(
                request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8), filename
        );
        if (response.statusCode() != 200) {
            throw new AuditionPostSourceException("OTR 첨부파일 '%s' 경로를 받지 못했습니다.".formatted(filename));
        }
        String path = filePath(response.body(), filename);
        return ORIGIN + "/?mb_ext=file&path=" + path + "&type=download";
    }

    private String filePath(String body, String filename) {
        try {
            JsonNode json = objectMapper.readTree(body);
            String path = json.path("data").path("file_path").asText();
            if (!"success".equals(json.path("state").asText()) || !FILE_PATH.matcher(path).matches()) {
                throw new AuditionPostSourceException("OTR 첨부파일 '%s'을(를) 받을 수 없습니다.".formatted(filename));
            }
            return path;
        } catch (JacksonException exception) {
            throw new AuditionPostSourceException("OTR 첨부파일 응답을 읽지 못했습니다.", exception);
        }
    }

    private String nonce(Document document) {
        for (Element script : document.select("script")) {
            Matcher matcher = NONCE.matcher(script.data());
            if (matcher.find()) {
                return matcher.group(1);
            }
        }
        throw new AuditionPostSourceException("OTR 첨부파일 인증 값을 찾을 수 없습니다.");
    }

    private String authorName(Document document) {
        Element author = document.selectFirst("#mb_audition_tr_user_name td .btn-user-info");
        return author == null ? text(document, "#mb_audition_tr_user_name td") : author.text();
    }

    private LocalDateTime postedAt(Element titleRow) {
        Element postedAt = titleRow.selectFirst("td span[style*='float:right']");
        if (postedAt == null) {
            return null;
        }
        try {
            return LocalDateTime.parse(postedAt.text().trim(), POSTED_AT);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private List<String> tags(Document document) {
        return document.select("#mb_audition_tr_tag a.mb-tag-item").stream()
                .map(tag -> tag.text().replaceFirst("^#", "").trim())
                .filter(tag -> !tag.isEmpty())
                .toList();
    }

    private boolean isOtrUpload(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                    && uri.getRawPath() != null && uri.getRawPath().startsWith(UPLOAD_PATH_PREFIX);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean isOtrHost(String url) {
        try {
            String host = URI.create(url).getHost();
            return host != null && (HOST.equals(host) || host.endsWith("." + HOST));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private URI requireOtrUri(String url) {
        URI uri = URI.create(url);
        if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) {
            throw new AuditionPostSourceException("OTR 이외의 주소에서는 파일을 받지 않습니다.");
        }
        return uri;
    }

    /** 업로드 파일명은 {@code F{번호}_원래이름}이다. 화면에 보일 원래 이름만 남긴다. */
    private String filenameOf(String url) {
        String rawPath = URI.create(url).getRawPath();
        String segment = rawPath.substring(rawPath.lastIndexOf('/') + 1);
        String decoded = URLDecoder.decode(segment.replace("+", "%2B"), StandardCharsets.UTF_8);
        String name = decoded.replaceFirst("^F[0-9]+_", "");
        return name.isBlank() ? "image" : name;
    }

    private String unescapeJavaScript(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (current == '\\' && index + 1 < value.length()) {
                index++;
                current = value.charAt(index);
            }
            result.append(current);
        }
        return result.toString();
    }

    private Element required(Element parent, String selector, String message) {
        Element element = parent.selectFirst(selector);
        if (element == null) {
            throw new AuditionPostSourceException(message);
        }
        return element;
    }

    private String text(Document document, String selector) {
        Element element = document.selectFirst(selector);
        return element == null ? "" : element.text().trim();
    }

    /** 이미 실패를 알리는 중이므로 닫기 실패는 원래 예외에 덧붙이기만 한다. */
    private void closeAfterFailure(InputStream stream, Exception failure) {
        try {
            stream.close();
        } catch (IOException closeFailure) {
            failure.addSuppressed(closeFailure);
        }
    }
}
