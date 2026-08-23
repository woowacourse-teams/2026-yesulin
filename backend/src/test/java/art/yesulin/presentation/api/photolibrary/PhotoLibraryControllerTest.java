package art.yesulin.presentation.api.photolibrary;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.file.FileService;
import art.yesulin.application.file.FileUploadCommand;
import art.yesulin.application.file.FileUploadResult;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:photo-library-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class PhotoLibraryControllerTest {

    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(1L, MemberType.APPLICANT,
            MemberStatus.ACTIVE);
    private static final String PHOTOS_PATH = "/api/v1/applicants/me/photo-library/photos";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FileService fileService;

    @Autowired
    private FakeObjectStorage objectStorage;

    @Test
    void addsReadyPhotoToLibrary() throws Exception {
        long fileId = requestReadyUpload(MEMBER_PRINCIPAL.memberId());

        mockMvc.perform(post(PHOTOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addPhotoRequest(fileId)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", PHOTOS_PATH + "/1"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.fileId").value(fileId))
                .andExpect(jsonPath("$.imageUrl").isString())
                .andExpect(jsonPath("$.displayOrder").value(0))
                .andExpect(jsonPath("$.representative").value(true))
                .andExpect(jsonPath("$.createdAt").isString());
    }

    @Test
    void findsPhotosInLibrary() throws Exception {
        long fileId = requestReadyUpload(MEMBER_PRINCIPAL.memberId());
        mockMvc.perform(post(PHOTOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addPhotoRequest(fileId)))
                .andExpect(status().isCreated());

        mockMvc.perform(get(PHOTOS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos.length()").value(1))
                .andExpect(jsonPath("$.photos[0].fileId").value(fileId))
                .andExpect(jsonPath("$.photos[0].imageUrl").value(
                        org.hamcrest.Matchers.startsWith("https://cdn.test/assets/files/")
                ))
                .andExpect(jsonPath("$.photos[0].representative").value(true));
    }

    @Test
    void returnsEmptyPhotoList() throws Exception {
        mockMvc.perform(get(PHOTOS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos").isEmpty());
    }

    @Test
    void changesRepresentativePhoto() throws Exception {
        long firstPhotoId = addReadyPhoto(MEMBER_PRINCIPAL.memberId());
        long secondPhotoId = addReadyPhoto(MEMBER_PRINCIPAL.memberId());

        mockMvc.perform(patch(PHOTOS_PATH + "/{photoId}/representative", secondPhotoId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos[0].id").value(secondPhotoId))
                .andExpect(jsonPath("$.photos[0].displayOrder").value(0))
                .andExpect(jsonPath("$.photos[0].representative").value(true))
                .andExpect(jsonPath("$.photos[1].id").value(firstPhotoId))
                .andExpect(jsonPath("$.photos[1].displayOrder").value(1))
                .andExpect(jsonPath("$.photos[1].representative").value(false));
    }

    @Test
    void softDeletesPhoto() throws Exception {
        long firstPhotoId = addReadyPhoto(MEMBER_PRINCIPAL.memberId());
        long secondPhotoId = addReadyPhoto(MEMBER_PRINCIPAL.memberId());

        mockMvc.perform(delete(PHOTOS_PATH + "/{photoId}", firstPhotoId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(PHOTOS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos.length()").value(1))
                .andExpect(jsonPath("$.photos[0].id").value(secondPhotoId))
                .andExpect(jsonPath("$.photos[0].displayOrder").value(0))
                .andExpect(jsonPath("$.photos[0].representative").value(true));
    }

    @Test
    void hidesPhotoOwnedByAnotherMemberWhenManagingPhoto() throws Exception {
        long anotherMembersPhotoId = addReadyPhoto(2L);

        mockMvc.perform(patch(PHOTOS_PATH + "/{photoId}/representative", anotherMembersPhotoId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_LIBRARY_PHOTO_NOT_FOUND"));

        mockMvc.perform(delete(PHOTOS_PATH + "/{photoId}", anotherMembersPhotoId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_LIBRARY_PHOTO_NOT_FOUND"));
    }

    @Test
    void rejectsPendingPhoto() throws Exception {
        FileUploadResult upload = fileService.requestUpload(
                MEMBER_PRINCIPAL.memberId(), new FileUploadCommand("profile.png", "image/png", 1_024L)
        );

        mockMvc.perform(post(PHOTOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addPhotoRequest(upload.fileId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FILE_NOT_READY"));
    }

    @Test
    void hidesPhotoOwnedByAnotherMember() throws Exception {
        long fileId = requestReadyUpload(2L);

        mockMvc.perform(post(PHOTOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addPhotoRequest(fileId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("FILE_NOT_FOUND"));
    }

    private long requestReadyUpload(long ownerId) {
        FileUploadResult upload = fileService.requestUpload(
                ownerId, new FileUploadCommand("profile.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(ownerId, upload.fileId());
        return upload.fileId();
    }

    private long addReadyPhoto(long ownerId) throws Exception {
        long fileId = requestReadyUpload(ownerId);
        MvcResult result = mockMvc.perform(post(PHOTOS_PATH)
                        .with(csrf())
                        .sessionAttr(
                                MemberPrincipal.SESSION_ATTRIBUTE, new MemberPrincipal(ownerId, MemberType.APPLICANT,
                                        MemberStatus.ACTIVE))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addPhotoRequest(fileId)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("id").asLong();
    }

    private String addPhotoRequest(long fileId) {
        return """
                {
                  "fileId": %d
                }
                """.formatted(fileId);
    }
}
