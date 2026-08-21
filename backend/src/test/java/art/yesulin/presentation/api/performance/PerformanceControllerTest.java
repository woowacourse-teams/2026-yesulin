package art.yesulin.presentation.api.performance;

import static org.hamcrest.Matchers.matchesPattern;
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
import art.yesulin.application.performance.CreatePerformanceCommand;
import art.yesulin.application.performance.CreatePerformanceRoleCommand;
import art.yesulin.application.performance.PerformanceResult;
import art.yesulin.application.performance.PerformanceService;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.performance.PerformanceRepository;
import art.yesulin.presentation.api.auth.AuthRole;
import art.yesulin.support.FakeObjectStorage;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:performance-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class PerformanceControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID, AuthRole.PRODUCER);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FileService fileService;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @BeforeEach
    void cleanUp() {
        performanceRepository.deleteAll();
        fileReferenceRepository.deleteAll();
        fileAssetRepository.deleteAll();
    }

    @Test
    void createsPerformance() throws Exception {
        long posterFileId = uploadReadyPoster();
        String request = """
                {
                  "posterFileId": %d,
                  "title": "햄릿",
                  "roadAddress": "서울특별시 종로구 대학로 12",
                  "roles": [
                    {"name": "햄릿", "description": "복수심에 흔들리는 덴마크 왕자"}
                  ]
                }
                """.formatted(posterFileId);

        mockMvc.perform(post("/api/v1/performances")
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern("/api/v1/performances/\\d+")))
                .andExpect(jsonPath("$.posterFileId").value(posterFileId))
                .andExpect(jsonPath("$.title").value("햄릿"))
                .andExpect(jsonPath("$.roadAddress").value("서울특별시 종로구 대학로 12"))
                .andExpect(jsonPath("$.createdAt").isString())
                .andExpect(jsonPath("$.roles[0].id").isNumber());
    }

    @Test
    void findsOwnedPerformances() throws Exception {
        PerformanceResult first = createPerformance(OWNER_ID, "햄릿");
        createPerformance(2L, "다른 소유자의 공연");
        PerformanceResult latest = createPerformance(OWNER_ID, "리어왕");

        mockMvc.perform(get("/api/v1/performances")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performances.length()").value(2))
                .andExpect(jsonPath("$.performances[0].id").value(latest.id()))
                .andExpect(jsonPath("$.performances[1].id").value(first.id()))
                .andExpect(jsonPath("$.performances[0].posterUrl").isString())
                .andExpect(jsonPath("$.performances[0].roles[0].id").isNumber());
    }

    @Test
    void findsOwnedPerformance() throws Exception {
        PerformanceResult created = createPerformance();

        mockMvc.perform(get("/api/v1/performances/{performanceId}", created.id())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(created.id()))
                .andExpect(jsonPath("$.roadAddress").value(created.roadAddress()));
    }

    @Test
    void rejectsCreateWhenNotLoggedIn() throws Exception {
        String request = """
                {
                 "posterFileId": 1,
                 "title": "햄릿",
                 "roadAddress": "서울특별시 종로구 대학로 12",
                 "roles": []
                }
                """;

        mockMvc.perform(post("/api/v1/performances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void updatesPerformanceBasicInformation() throws Exception {
        PerformanceResult created = createPerformance();
        String request = """
                {
                  "title": "햄릿 리뉴얼",
                  "roadAddress": "서울특별시 중구 세종대로 110"
                }
                """;

        mockMvc.perform(patch("/api/v1/performances/{performanceId}/basic-information", created.id())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posterFileId").value(created.posterFileId()))
                .andExpect(jsonPath("$.title").value("햄릿 리뉴얼"))
                .andExpect(jsonPath("$.roles[0].id").value(created.roles().getFirst().id()));
    }

    @Test
    void updatesPerformancePoster() throws Exception {
        PerformanceResult created = createPerformance();
        long changedPosterFileId = uploadReadyPoster();
        String request = """
                {"posterFileId": %d}
                """.formatted(changedPosterFileId);

        mockMvc.perform(patch("/api/v1/performances/{performanceId}/poster", created.id())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posterFileId").value(changedPosterFileId))
                .andExpect(jsonPath("$.title").value(created.title()));
    }

    @Test
    void addsPerformanceRole() throws Exception {
        PerformanceResult created = createPerformance();
        String request = """
                {"name": "클로디어스", "description": "새로 추가한 배역"}
                """;

        mockMvc.perform(post("/api/v1/performances/{performanceId}/roles", created.id())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("클로디어스"));
    }

    @Test
    void updatesPerformanceRole() throws Exception {
        PerformanceResult created = createPerformance();
        long roleId = created.roles().getFirst().id();
        String request = """
                {"name": "햄릿 왕", "description": "수정된 기존 배역"}
                """;

        mockMvc.perform(patch("/api/v1/performances/{performanceId}/roles/{roleId}", created.id(), roleId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roleId))
                .andExpect(jsonPath("$.name").value("햄릿 왕"));
    }

    @Test
    void removesPerformanceRole() throws Exception {
        PerformanceResult created = createPerformance();
        long roleId = created.roles().getFirst().id();

        mockMvc.perform(delete("/api/v1/performances/{performanceId}/roles/{roleId}", created.id(), roleId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isNoContent());
    }

    private PerformanceResult createPerformance() {
        return createPerformance(OWNER_ID, "햄릿");
    }

    private PerformanceResult createPerformance(long ownerId, String title) {
        return performanceService.create(
                ownerId,
                new CreatePerformanceCommand(
                        uploadReadyPoster(ownerId),
                        title,
                        "서울특별시 종로구 대학로 12",
                        List.of(new CreatePerformanceRoleCommand("햄릿", "덴마크 왕자"))
                )
        );
    }

    private long uploadReadyPoster() {
        return uploadReadyPoster(OWNER_ID);
    }

    private long uploadReadyPoster(long ownerId) {
        FileUploadResult upload = fileService.requestUpload(
                ownerId, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(ownerId, upload.fileId());
        return upload.fileId();
    }
}
