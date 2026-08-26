package art.yesulin.presentation.api.photolibrary;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
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
        "spring.datasource.url=jdbc:h2:mem:actor-photo-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class ActorPhotoUploadControllerTest {

    private static final long MAX_PHOTO_SIZE = 20L * 1024 * 1024;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(1L, MemberType.APPLICANT,
            MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void issuesPresignedUploadUrlForActorPhoto() throws Exception {
        String response = mockMvc.perform(post("/api/v1/actor-photos/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest("profile.jpg", "image/jpeg", MAX_PHOTO_SIZE)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileId").isNumber())
                .andExpect(jsonPath("$.uploadUrl").isString())
                .andExpect(jsonPath("$.method").value("PUT"))
                .andExpect(jsonPath("$['headers']['Content-Type']").value("image/jpeg"))
                .andReturn().getResponse().getContentAsString();
        long fileId = objectMapper.readTree(response).get("fileId").asLong();

        assertEquals(
                MEMBER_PRINCIPAL.memberId(),
                fileAssetRepository.findById(fileId).orElseThrow().getOwnerId()
        );
        assertEquals(true, fileAssetRepository.findById(fileId).orElseThrow().getObjectKey()
                .matches("private/actor-photos/\\d{8}/[0-9a-f-]{36}"));
    }

    @Test
    void acceptsWebpActorPhoto() throws Exception {
        mockMvc.perform(post("/api/v1/actor-photos/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest("profile.webp", "image/webp", 1_024L)))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsActorPhotoLargerThanTwentyMegabytes() throws Exception {
        mockMvc.perform(post("/api/v1/actor-photos/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest("profile.png", "image/png", MAX_PHOTO_SIZE + 1)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsVideoForActorPhoto() throws Exception {
        mockMvc.perform(post("/api/v1/actor-photos/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest("profile.mp4", "video/mp4", 1_024L)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void completesUploadedActorPhoto() throws Exception {
        String response = mockMvc.perform(post("/api/v1/actor-photos/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest("profile.png", "image/png", 1_024L)))
                .andReturn().getResponse().getContentAsString();
        JsonNode upload = objectMapper.readTree(response);
        long fileId = upload.get("fileId").asLong();
        objectStorage.upload(upload.get("uploadUrl").asString(), "image/png", 1_024L);

        mockMvc.perform(patch("/api/v1/actor-photos/{fileId}/completion", fileId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNoContent())
                .andExpect(jsonPath("$").doesNotExist());
    }

    @Test
    void returnsUploadedActorPhotoOnlyThroughPrivateContentEndpoint() throws Exception {
        String response = mockMvc.perform(post("/api/v1/actor-photos/upload-requests")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(uploadRequest("profile.png", "image/png", 3L)))
                .andReturn().getResponse().getContentAsString();
        JsonNode upload = objectMapper.readTree(response);
        long fileId = upload.get("fileId").asLong();
        objectStorage.upload(upload.get("uploadUrl").asString(), "image/png", 3L);
        mockMvc.perform(patch("/api/v1/actor-photos/{fileId}/completion", fileId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL));

        mockMvc.perform(get("/api/v1/files/{fileId}/content", fileId)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(new byte[3]))
                .andExpect(header().string("Cache-Control", "no-store, must-revalidate"));
    }

    private String uploadRequest(String originalFilename, String contentType, long size) {
        return """
                {
                  "originalFilename": "%s",
                  "contentType": "%s",
                  "size": %d
                }
                """.formatted(originalFilename, contentType, size);
    }
}
