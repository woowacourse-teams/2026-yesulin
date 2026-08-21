package art.yesulin.presentation.api.performance;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.presentation.api.auth.AuthRole;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:file-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class PerformancePosterUploadControllerTest {

    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(1L, AuthRole.PRODUCER);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void issuesPresignedUploadUrl() throws Exception {
        mockMvc.perform(post("/api/v1/performance-posters/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileId").isNumber())
                .andExpect(jsonPath("$.uploadUrl").isString())
                .andExpect(jsonPath("$.method").value("PUT"))
                .andExpect(jsonPath("$['headers']['Content-Type']").value("image/png"));
    }

    @Test
    void rejectsUploadRequestWithoutCsrfToken() throws Exception {
        mockMvc.perform(post("/api/v1/performance-posters/upload-requests")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest()))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsVideoForPerformancePoster() throws Exception {
        String request = uploadRequest().replace("image/png", "video/mp4");

        mockMvc.perform(post("/api/v1/performance-posters/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest());
    }

    @Test
    void completesUploadedFile() throws Exception {
        String response = mockMvc.perform(post("/api/v1/performance-posters/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest()))
                .andReturn().getResponse().getContentAsString();
        JsonNode upload = objectMapper.readTree(response);
        long fileId = upload.get("fileId").asLong();
        objectStorage.upload(upload.get("uploadUrl").asText(), "image/png", 1_024L);

        mockMvc.perform(patch("/api/v1/performance-posters/{fileId}/completion", fileId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNoContent())
                .andExpect(jsonPath("$").doesNotExist());
    }

    private String uploadRequest() {
        return """
                {
                  "originalFilename": "hamlet.png",
                  "contentType": "image/png",
                  "size": 1024
                }
                """;
    }
}
