package art.yesulin.auth.application;

import static org.assertj.core.api.Assertions.assertThat;

import art.yesulin.infrastructure.mail.MailMessage;
import java.time.Instant;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

class EmailVerificationMailFactoryTest {

    private final EmailVerificationMailFactory factory = new EmailVerificationMailFactory();

    @Test
    void preservesLeadingZerosAndShowsTheActualDeadlineInKoreaTimeAcrossMidnight() {
        MailMessage mail = factory.create("producer@example.com", "000123",
                Instant.parse("2026-11-02T15:03:00Z"));

        Document html = Jsoup.parse(mail.htmlContent());
        assertThat(html.selectFirst("code").text()).isEqualTo("000123");
        assertThat(html.text()).contains("2026.11.03 00:03:00 (한국시간)까지 유효");
        assertThat(mail.textContent()).contains("인증번호: 000123", "2026.11.03 00:03:00 (한국시간)");
        assertThat(mail.htmlContent()).doesNotContain("{{verificationCode}}", "{{expiresAt}}");
    }

    @Test
    void providesRecoveryGuidanceAndOnlyThePublicLogoWithoutInteractiveElements() {
        MailMessage mail = factory.create("producer@example.com", "123456", Instant.parse("2026-11-02T12:00:00Z"));

        assertThat(mail.textContent()).contains("가장 최근 메일", "새 인증번호를 요청", "요청하지 않으셨다면");
        Document html = Jsoup.parse(mail.htmlContent());
        assertThat(html.text()).contains("가장 최근 메일", "새 인증번호를 요청", "직접 가입을 요청하지 않으셨나요?");
        assertThat(html.select("img")).hasSize(1);
        assertThat(html.selectFirst("img").attr("src"))
                .isEqualTo("https://yesulin.art/images/yesulin-logo-transparent.png");
        assertThat(html.selectFirst("img").attr("alt")).isEqualTo("예술in");
        assertThat(html.select("a, button, script, link, iframe, form, [onclick]")).isEmpty();
        assertThat(mail.htmlContent()).doesNotContain("url(", "@import");
    }
}
