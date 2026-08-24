package art.yesulin.domain.video;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

public record YouTubeVideoUrl(String url, String videoId) {

    private static final Pattern VIDEO_ID_PATTERN = Pattern.compile("[A-Za-z0-9_-]{11}");
    private static final Set<String> YOUTUBE_HOSTS = Set.of("youtube.com", "www.youtube.com", "m.youtube.com");

    public static Optional<YouTubeVideoUrl> parse(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            URI uri = URI.create(value.strip());
            if (!hasHttpScheme(uri) || uri.getHost() == null) {
                return Optional.empty();
            }
            return findVideoId(uri)
                    .filter(videoId -> VIDEO_ID_PATTERN.matcher(videoId).matches())
                    .map(videoId -> new YouTubeVideoUrl("https://youtu.be/" + videoId, videoId));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private static boolean hasHttpScheme(URI uri) {
        return "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
    }

    private static Optional<String> findVideoId(URI uri) {
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (host.equals("youtu.be")) {
            return singlePathSegment(uri);
        }
        if (!YOUTUBE_HOSTS.contains(host)) {
            return Optional.empty();
        }
        if ("/watch".equals(uri.getPath())) {
            return queryParameter(uri, "v");
        }
        PathSegments segments = PathSegments.from(uri);
        if (segments.size() == 2 && (segments.first().equals("shorts") || segments.first().equals("embed"))) {
            return Optional.of(segments.second());
        }
        return Optional.empty();
    }

    private static Optional<String> singlePathSegment(URI uri) {
        PathSegments segments = PathSegments.from(uri);
        if (segments.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(segments.first());
    }

    private static Optional<String> queryParameter(URI uri, String name) {
        String query = uri.getQuery();
        if (query == null) {
            return Optional.empty();
        }
        return Arrays.stream(query.split("&"))
                .map(parameter -> parameter.split("=", 2))
                .filter(parts -> parts.length == 2 && parts[0].equals(name))
                .map(parts -> parts[1])
                .findFirst();
    }

    private record PathSegments(List<String> values) {

        private static PathSegments from(URI uri) {
            return new PathSegments(Arrays.stream(uri.getPath().split("/"))
                    .filter(segment -> !segment.isBlank())
                    .toList());
        }

        private int size() {
            return values.size();
        }

        private String first() {
            return values.getFirst();
        }

        private String second() {
            return values.get(1);
        }
    }
}
