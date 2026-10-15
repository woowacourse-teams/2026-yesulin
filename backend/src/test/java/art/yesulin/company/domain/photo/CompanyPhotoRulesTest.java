package art.yesulin.company.domain.photo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CompanyPhotoRulesTest {

    @Test
    void acceptsOnlyWebImageTypes() {
        assertEquals(Optional.of("image/jpeg"), CompanyPhotoRules.contentType(" Image/JPEG; charset=binary"));
        assertEquals(Optional.of("image/webp"), CompanyPhotoRules.contentType("image/webp"));
        assertTrue(CompanyPhotoRules.contentType("image/svg+xml").isEmpty());
        assertTrue(CompanyPhotoRules.contentType("image/heic").isEmpty());
        assertTrue(CompanyPhotoRules.contentType(null).isEmpty());
    }

    @Test
    void checksFileSignatureAgainstReportedType() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0};
        byte[] webp = "RIFF\0\0\0\0WEBP".getBytes(StandardCharsets.US_ASCII);

        assertTrue(CompanyPhotoRules.matchesSignature("image/jpeg", jpeg));
        assertTrue(CompanyPhotoRules.matchesSignature("image/png", png));
        assertTrue(CompanyPhotoRules.matchesSignature("image/webp", webp));
        assertFalse(CompanyPhotoRules.matchesSignature("image/jpeg", png));
        assertFalse(CompanyPhotoRules.matchesSignature("image/png", "<html><body>".getBytes(StandardCharsets.UTF_8)));
        assertFalse(CompanyPhotoRules.matchesSignature("image/webp", new byte[] {'R', 'I'}));
    }
}
