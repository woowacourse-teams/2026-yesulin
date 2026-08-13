package art.yesulin.presentation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ApplicantJourneyTest {

    @Container
    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("yesulin")
            .withUsername("yesulin")
            .withPassword("yesulin-test");

    private final MockMvc mockMvc;

    @Autowired
    ApplicantJourneyTest(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Test
    @DisplayName("CSRF 토큰이 없는 회원가입 쓰기 요청을 거부한다")
    void rejectsWriteWithoutCsrfToken() throws Exception {
        // when & then
        mockMvc.perform(post("/api/v1/applicants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"blocked@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("미인증 보호 요청을 공통 오류 형식으로 거부한다")
    void rejectsProtectedRequestWithCommonErrorResponse() throws Exception {
        mockMvc.perform(get("/api/v1/performances"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("지원자가 가입·로그인하고 프로필을 MySQL에 저장해 다시 조회한다")
    void storesProfileForAuthenticatedApplicant() throws Exception {
        // given
        mockMvc.perform(post("/api/v1/applicants")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"journey@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("journey@example.com"));

        MvcResult loginResult = mockMvc.perform(post("/api/v1/sessions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"journey@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authenticated").value(true))
                .andReturn();
        HttpSession session = loginResult.getRequest().getSession(false);

        // when
        mockMvc.perform(patch("/api/v1/applicants/me/profile")
                        .session((org.springframework.mock.web.MockHttpSession) session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "activityName": "무대이름",
                                  "name": "지원자",
                                  "height": 170,
                                  "weight": 60,
                                  "birthDate": "2000-01-01",
                                  "gender": "NOT_DISCLOSED",
                                  "phone": "010-0000-0000",
                                  "email": "journey@example.com",
                                  "residence": "서울",
                                  "additionalInformation": {"school": "예술대학교"},
                                  "photoUrls": ["https://example.com/profile.jpg"],
                                  "profileSaveConsent": true
                                }
                                """))
                .andExpect(status().isOk());

        // then
        mockMvc.perform(get("/api/v1/applicants/me/profile")
                        .session((org.springframework.mock.web.MockHttpSession) session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("지원자"))
                .andExpect(jsonPath("$.residence").value("서울"))
                .andExpect(jsonPath("$.photoUrls[0]").value("https://example.com/profile.jpg"));
    }

    @Test
    @DisplayName("공연사 가입과 로그인 후 활성 공연사 문맥으로 공연을 등록한다")
    void createsPerformanceWithActiveCompanySession() throws Exception {
        // given
        MvcResult registrationResult = mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "producer-journey@example.com",
                                  "password": "password123",
                                  "companyName": "테스트 제작사",
                                  "businessNumber": "999-88-77777",
                                  "representativeName": "김대표",
                                  "contactName": "박담당"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        var registrationSession = (org.springframework.mock.web.MockHttpSession)
                registrationResult.getRequest().getSession(false);

        MvcResult loginResult = mockMvc.perform(post("/api/v1/sessions")
                        .session(registrationSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "producer-journey@example.com",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCompanyId").isNumber())
                .andReturn();
        var authenticatedSession = (org.springframework.mock.web.MockHttpSession)
                loginResult.getRequest().getSession(false);

        // when & then
        mockMvc.perform(post("/api/v1/performances")
                        .session(authenticatedSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "세션 문맥 공연",
                                  "venue": "예술극장",
                                  "posterUrl": "https://example.com/poster.jpg"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("세션 문맥 공연"));

        mockMvc.perform(get("/api/v1/performances").session(authenticatedSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("세션 문맥 공연"));
    }

    @Test
    @DisplayName("같은 브라우저에서 공연사에서 지원자로 로그인해도 활성 공연사가 남지 않는다")
    void clearsActiveCompanyWhenAccountChanges() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "switch-producer@example.com",
                                  "password": "password123",
                                  "companyName": "전환 테스트 제작사",
                                  "contactName": "담당자"
                                }
                                """))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/applicants")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "switch-applicant@example.com",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isCreated());

        MvcResult producerLogin = mockMvc.perform(post("/api/v1/sessions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "switch-producer@example.com",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCompanyId").isNumber())
                .andReturn();
        var session = (org.springframework.mock.web.MockHttpSession)
                producerLogin.getRequest().getSession(false);

        MvcResult applicantLogin = mockMvc.perform(post("/api/v1/sessions")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "switch-applicant@example.com",
                                  "password": "password123"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCompanyId").isEmpty())
                .andReturn();

        mockMvc.perform(get("/api/v1/applicants/me/profile")
                        .session((org.springframework.mock.web.MockHttpSession)
                                applicantLogin.getRequest().getSession(false)))
                .andExpect(status().isOk());
    }
}
