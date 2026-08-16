package art.yesulin.presentation.api.performance;

import static org.hamcrest.Matchers.matchesPattern;
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
import art.yesulin.domain.performance.PerformanceRepository;
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
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FileService fileService;

    @Autowired
    private PerformanceService performanceService;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private PerformanceRepository performanceRepository;

    @Autowired
    private FakeObjectStorage objectStorage;

    @BeforeEach
    void cleanUp() {
        performanceRepository.deleteAll();
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
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", matchesPattern("/api/v1/performances/\\d+")))
                .andExpect(jsonPath("$.posterFileId").value(posterFileId))
                .andExpect(jsonPath("$.title").value("햄릿"))
                .andExpect(jsonPath("$.roadAddress").value("서울특별시 종로구 대학로 12"))
                .andExpect(jsonPath("$.roles[0].id").isNumber());
    }

    @Test
    void updatesPerformanceAndPoster() throws Exception {
        PerformanceResult created = performanceService.create(
                OWNER_ID,
                new CreatePerformanceCommand(
                        uploadReadyPoster(),
                        "햄릿",
                        "서울특별시 종로구 대학로 12",
                        List.of(new CreatePerformanceRoleCommand("햄릿", "덴마크 왕자"))
                )
        );
        long changedPosterFileId = uploadReadyPoster();
        String request = """
                {
                  "posterFileId": %d,
                  "title": "햄릿 리뉴얼",
                  "roadAddress": "서울특별시 중구 세종대로 110",
                  "roles": [
                    {"id": %d, "name": "햄릿 왕", "description": "기존 배역 수정"},
                    {"name": "클로디어스", "description": "새 배역"}
                  ]
                }
                """.formatted(changedPosterFileId, created.roles().getFirst().id());

        mockMvc.perform(patch("/api/v1/performances/{performanceId}", created.id())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.posterFileId").value(changedPosterFileId))
                .andExpect(jsonPath("$.title").value("햄릿 리뉴얼"))
                .andExpect(jsonPath("$.roles[0].id").value(created.roles().getFirst().id()))
                .andExpect(jsonPath("$.roles[1].id").isNumber());
    }

    private long uploadReadyPoster() {
        FileUploadResult upload = fileService.requestUpload(
                OWNER_ID, new FileUploadCommand("poster.png", "image/png", 1_024L)
        );
        objectStorage.upload(upload.uploadUrl(), "image/png", 1_024L);
        fileService.completeUpload(OWNER_ID, upload.fileId());
        return upload.fileId();
    }
}
