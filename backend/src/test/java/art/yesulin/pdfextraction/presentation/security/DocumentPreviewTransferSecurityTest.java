package art.yesulin.pdfextraction.presentation.security;

import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.pdfextraction.application.DocumentPreviewReceiver;
import art.yesulin.pdfextraction.application.DocumentPreviewTransfers;
import art.yesulin.pdfextraction.application.PdfExtractionResultReceiver;
import art.yesulin.pdfextraction.presentation.api.PdfExtractionCallbackController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

class DocumentPreviewTransferSecurityTest {

    private static final String CALLBACK = "test-callback-only-".repeat(3);
    private static final String TRANSFER = "test-transfer-only-".repeat(3);
    private static final String TRANSFERS = "/internal/v1/pdf-extractions/preview-transfers";
    private static final String PREVIEWS = "/internal/v1/pdf-extractions/previews";
    private static final String BODY = """
            {"jobId":"11111111-1111-4111-8111-111111111111","originalFileKey":"test",
             "sourceETag":"22883f08183c23e806d69fc25c410109","operation":"PREVIEW_READ"}
            """;
    private final AnnotationConfigWebApplicationContext context = new AnnotationConfigWebApplicationContext();

    @AfterEach
    void close() {
        context.close();
    }

    @Test
    void separateTokenOnlyAuthorizesTheExactTransferPost() throws Exception {
        MockMvc mvc = start(TRANSFER);
        mvc.perform(post(TRANSFERS).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(TRANSFERS).header(HttpHeaders.AUTHORIZATION, "Bearer " + CALLBACK)
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized()).andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
        mvc.perform(post(TRANSFERS).header(HttpHeaders.AUTHORIZATION, "Bearer " + TRANSFER)
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isNoContent()).andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"));
        mvc.perform(get(TRANSFERS).header(HttpHeaders.AUTHORIZATION, "Bearer " + TRANSFER))
                .andExpect(status().isForbidden());
        mvc.perform(post(PREVIEWS).header(HttpHeaders.AUTHORIZATION, "Bearer " + TRANSFER)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(PREVIEWS).header(HttpHeaders.AUTHORIZATION, "Bearer " + CALLBACK)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post(TRANSFERS + "/extra").header(HttpHeaders.AUTHORIZATION, "Bearer " + CALLBACK))
                .andExpect(status().isForbidden());
    }

    @Test
    void unsetTransferSecretFailsClosed() throws Exception {
        assertRejectedWhenConfigured("");
    }

    @Test
    void configuringSameSecretAsExistingExtractionCannotExpandItsAuthority() throws Exception {
        assertRejectedWhenConfigured(CALLBACK);
    }

    private void assertRejectedWhenConfigured(String transferSecret) throws Exception {
        start(transferSecret).perform(post(TRANSFERS).header(HttpHeaders.AUTHORIZATION, "Bearer " + CALLBACK)
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
    }

    private MockMvc start(String transferSecret) {
        context.setServletContext(new MockServletContext());
        TestPropertyValues.of("yesulin.pdf-extraction.enabled=true",
                "yesulin.pdf-extraction.callback-secret=" + CALLBACK,
                "yesulin.pdf-extraction.preview-transfer-secret=" + transferSecret).applyTo(context);
        context.register(WebConfig.class);
        context.refresh();
        return MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableWebMvc
    @EnableWebSecurity
    @Import(PdfExtractionCallbackSecurityConfiguration.class)
    static class WebConfig {

        @Bean
        PdfExtractionCallbackController callbacks() {
            return new PdfExtractionCallbackController(mock(PdfExtractionResultReceiver.class),
                    mock(DocumentPreviewReceiver.class), mock(DocumentPreviewTransfers.class));
        }
    }
}
