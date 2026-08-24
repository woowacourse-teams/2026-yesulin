package art.yesulin.presentation.api.videolibrary;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
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
        "spring.datasource.url=jdbc:h2:mem:video-library-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class VideoLibraryControllerTest {

    private static final String VIDEOS_PATH = "/api/v1/applicants/me/video-library/videos";
    private static final MemberPrincipal APPLICANT = new MemberPrincipal(
            1L, MemberType.APPLICANT, MemberStatus.ACTIVE
    );

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void returnsEmptyVideoLibrary() throws Exception {
        mockMvc.perform(get(VIDEOS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos").isEmpty());
    }

    @Test
    void addsAndNormalizesYoutubeVideo() throws Exception {
        mockMvc.perform(post(VIDEOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(videoRequest("https://www.youtube.com/watch?v=abcdefghijk")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", VIDEOS_PATH + "/1"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.url").value("https://youtu.be/abcdefghijk"))
                .andExpect(jsonPath("$.youtubeId").value("abcdefghijk"))
                .andExpect(jsonPath("$.displayOrder").value(0));
    }

    @Test
    void rejectsInvalidAndDuplicateYoutubeVideo() throws Exception {
        addVideo(APPLICANT, "https://youtu.be/abcdefghijk");

        mockMvc.perform(post(VIDEOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(videoRequest("https://youtube.com/")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VIDEO_LIBRARY_INVALID_URL"));

        mockMvc.perform(post(VIDEOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(videoRequest("https://youtube.com/embed/abcdefghijk")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VIDEO_LIBRARY_DUPLICATE_VIDEO"));
    }

    @Test
    void changesVideoDisplayOrder() throws Exception {
        long firstId = addVideo(APPLICANT, "https://youtu.be/abcdefghijk");
        long secondId = addVideo(APPLICANT, "https://youtu.be/lmnopqrstuv");

        mockMvc.perform(patch(VIDEOS_PATH + "/{videoId}", secondId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayOrder\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos[0].id").value(secondId))
                .andExpect(jsonPath("$.videos[0].displayOrder").value(0))
                .andExpect(jsonPath("$.videos[1].id").value(firstId))
                .andExpect(jsonPath("$.videos[1].displayOrder").value(1));
    }

    @Test
    void deletesVideoAndCompactsDisplayOrder() throws Exception {
        long firstId = addVideo(APPLICANT, "https://youtu.be/abcdefghijk");
        long secondId = addVideo(APPLICANT, "https://youtu.be/lmnopqrstuv");

        mockMvc.perform(delete(VIDEOS_PATH + "/{videoId}", firstId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT))
                .andExpect(status().isNoContent());

        mockMvc.perform(get(VIDEOS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videos.length()").value(1))
                .andExpect(jsonPath("$.videos[0].id").value(secondId))
                .andExpect(jsonPath("$.videos[0].displayOrder").value(0));
    }

    @Test
    void hidesAnotherApplicantsVideo() throws Exception {
        MemberPrincipal anotherApplicant = new MemberPrincipal(2L, MemberType.APPLICANT, MemberStatus.ACTIVE);
        long anotherVideoId = addVideo(anotherApplicant, "https://youtu.be/abcdefghijk");

        mockMvc.perform(delete(VIDEOS_PATH + "/{videoId}", anotherVideoId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("VIDEO_LIBRARY_VIDEO_NOT_FOUND"));
    }

    @Test
    void rejectsAnonymousAndProducer() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(get(VIDEOS_PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));

        mockMvc.perform(get(VIDEOS_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    private long addVideo(MemberPrincipal principal, String url) throws Exception {
        MvcResult result = mockMvc.perform(post(VIDEOS_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(videoRequest(url)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("id").asLong();
    }

    private String videoRequest(String url) {
        return """
                {
                  "url": "%s"
                }
                """.formatted(url);
    }
}
