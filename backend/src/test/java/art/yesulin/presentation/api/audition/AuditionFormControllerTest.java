package art.yesulin.presentation.api.audition;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.audition.Audition;
import art.yesulin.domain.audition.AuditionRepository;
import art.yesulin.domain.audition.PerformancePeriod;
import art.yesulin.domain.audition.form.AuditionFormRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:audition-form-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AuditionFormControllerTest {

    private static final long OWNER_ID = 1L;
    private static final MemberPrincipal MEMBER_PRINCIPAL = new MemberPrincipal(OWNER_ID, MemberType.PRODUCER,
            MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditionFormRepository formRepository;

    @Autowired
    private AuditionRepository auditionRepository;

    @BeforeEach
    void cleanUp() {
        formRepository.deleteAll();
        auditionRepository.deleteAll();
    }

    @Test
    void savesAndFindsApplicationForm() throws Exception {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        String request = """
                {
                  "basicFields": ["name", "email"],
                  "additionalFields": ["career", "link"],
                  "photoRequirements": [
                    {"description": "정면 사진", "count": 3}
                  ],
                  "videoRequirements": [
                    {"description": "자유 연기 영상"}
                  ],
                  "additionalQuestions": [
                    {"question": "지원 동기를 알려주세요.", "required": true}
                  ]
                }
                """;

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/application-form", audition.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.basicFields[0]").value("NAME"))
                .andExpect(jsonPath("$.photoRequirements[0].id").isNumber())
                .andExpect(jsonPath("$.photoRequirements[0].order").value(1))
                .andExpect(jsonPath("$.videoRequirements[0].description").value("자유 연기 영상"))
                .andExpect(jsonPath("$.additionalQuestions[0].answerMaxLength").value(2_000));

        mockMvc.perform(get("/api/v1/auditions/{auditionId}/application-form", audition.getPublicId())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.additionalFields[0]").value("LINK"))
                .andExpect(jsonPath("$.additionalFields[1]").value("CAREER"))
                .andExpect(jsonPath("$.additionalQuestions[0].required").value(true));
    }

    @Test
    void rejectsPhotoRequirementsWhenTotalCountExceedsThree() throws Exception {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        String request = """
                {
                  "basicFields": [],
                  "additionalFields": [],
                  "photoRequirements": [
                    {"description": "정면 사진", "count": 2},
                    {"description": "전신 사진", "count": 2}
                  ],
                  "videoRequirements": [],
                  "additionalQuestions": []
                }
                """;

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/application-form", audition.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AUDITION_INVALID_FORM"))
                .andExpect(jsonPath("$.message").value("프로필 사진은 모두 합해 최대 3장까지 요청할 수 있습니다."));
    }

    @Test
    void rejectsMoreThanThreeVideoRequirements() throws Exception {
        Audition audition = auditionRepository.save(new Audition(
                1L,
                OWNER_ID,
                "햄릿 오디션",
                new PerformancePeriod(LocalDate.of(2026, 10, 1), null)
        ));
        String request = """
                {
                  "basicFields": [],
                  "additionalFields": [],
                  "photoRequirements": [],
                  "videoRequirements": [
                    {"description": "자유 연기 영상"},
                    {"description": "지정 연기 영상"},
                    {"description": "노래 영상"},
                    {"description": "춤 영상"}
                  ],
                  "additionalQuestions": []
                }
                """;

        mockMvc.perform(put("/api/v1/auditions/{auditionId}/application-form", audition.getPublicId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, MEMBER_PRINCIPAL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("영상 요구는 최대 3개까지 추가할 수 있습니다."));
    }
}
