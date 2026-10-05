package art.yesulin.application.auditionpost;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class AuditionPostFileRulesTest {

    @Test
    void usesReportedImageTypeAndFallsBackToExtension() {
        assertEquals(
                Optional.of("image/png"),
                AuditionPostFileRules.imageContentType("image/png; charset=binary", "a")
        );
        assertEquals(
                Optional.of("image/jpeg"),
                AuditionPostFileRules.imageContentType("application/octet-stream", "a.JPG")
        );
        assertTrue(AuditionPostFileRules.imageContentType("image/svg+xml", "a.svg").isEmpty());
    }

    @Test
    void acceptsAuditionDocumentsOnly() {
        assertEquals(Optional.of("application/x-hwp"), AuditionPostFileRules.attachmentContentType("지원서.HWP"));
        assertEquals(Optional.of("application/pdf"), AuditionPostFileRules.attachmentContentType("대본.pdf"));
        assertTrue(AuditionPostFileRules.attachmentContentType("setup.exe").isEmpty());
        assertTrue(AuditionPostFileRules.attachmentContentType("page.html").isEmpty());
        assertTrue(AuditionPostFileRules.attachmentContentType("이름없음").isEmpty());
    }

    @Test
    void encodesKoreanFilenameForDownload() {
        assertEquals(
                "attachment; filename=\"attachment.doc\"; filename*=UTF-8''%EC%A7%80%EC%9B%90%20%EC%84%9C%EC%8B%9D.doc",
                AuditionPostFileRules.attachmentDisposition("지원 서식.doc")
        );
    }
}
