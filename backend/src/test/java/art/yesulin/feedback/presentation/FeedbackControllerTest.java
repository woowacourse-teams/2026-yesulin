package art.yesulin.feedback.presentation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.feedback.application.FeedbackNotifier;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:feedback-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class FeedbackControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);
    private static final MemberPrincipal ACTOR = new MemberPrincipal(2L, MemberType.APPLICANT, MemberStatus.ACTIVE);
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01};

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeedbackNotifier notifier;

    @Test
    @DisplayName("비회원이 사진과 함께 보낸 의견을 운영자만 목록에서 사진 주소와 함께 본다")
    void guestSendsImagesAndOnlyAdminListsThem() throws Exception {
        mockMvc.perform(multipart("/api/v1/public/feedback")
                        .file(request("{\"type\":\"BUG\",\"content\":\"사진 봐 주세요\",\"pagePath\":\"/shows\"}"))
                        .file(new MockMultipartFile("images", "a.jpg", "image/jpeg", JPEG))
                        .with(csrf()).with(remote("10.1.0.1")))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/admin/feedback").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].content").value("사진 봐 주세요"))
                .andExpect(jsonPath("$.items[0].memberId").doesNotExist())
                .andExpect(jsonPath("$.items[0].imageUrls.length()").value(1));
        mockMvc.perform(get("/api/v1/admin/feedback").sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ACTOR))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("이미지가 아닌 첨부와 요청 본문이 없는 multipart는 400이다")
    void rejectsInvalidMultipart() throws Exception {
        mockMvc.perform(multipart("/api/v1/public/feedback")
                        .file(request("{\"type\":\"BUG\",\"content\":\"내용\"}"))
                        .file(new MockMultipartFile("images", "a.png", "image/png", "<svg/>".getBytes()))
                        .with(csrf()).with(remote("10.1.0.2")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("FEEDBACK_INVALID_IMAGE"));
        mockMvc.perform(multipart("/api/v1/public/feedback")
                        .file(new MockMultipartFile("images", "a.jpg", "image/jpeg", JPEG))
                        .with(csrf()).with(remote("10.1.0.3")))
                .andExpect(status().isBadRequest());
    }

    private static MockMultipartFile request(String json) {
        return new MockMultipartFile("request", "", MediaType.APPLICATION_JSON_VALUE,
                json.getBytes(StandardCharsets.UTF_8));
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor remote(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }
}
