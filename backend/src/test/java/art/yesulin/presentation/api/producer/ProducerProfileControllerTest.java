package art.yesulin.presentation.api.producer;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:producer-profile-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
@Transactional
class ProducerProfileControllerTest {

    private static final String PROFILE_PATH = "/api/v1/producers/me";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProducerRepository producerRepository;

    private MemberPrincipal producerPrincipal;

    @BeforeEach
    void setUp() {
        Member member = memberRepository.save(Member.ofProducer("producer@example.com", "encoded-password"));
        producerRepository.save(new Producer(member.getId(), "극단 예술인", "010-1234-5678"));
        producerPrincipal = new MemberPrincipal(member.getId(), MemberType.PRODUCER, MemberStatus.ACTIVE);
    }

    @Test
    void findsMyProfileWithAccountInformation() throws Exception {
        mockMvc.perform(get(PROFILE_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("극단 예술인"))
                .andExpect(jsonPath("$.contactName").doesNotExist())
                .andExpect(jsonPath("$.contactRole").doesNotExist())
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.email").value("producer@example.com"))
                .andExpect(jsonPath("$.phone").value("01012345678"))
                .andExpect(jsonPath("$.verificationStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.verifiedAt").exists());
    }

    @Test
    void replacesOnlyProvidedFields() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "contactName": "김담당", "contactRole": "캐스팅 담당" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("극단 예술인"))
                .andExpect(jsonPath("$.contactName").value("김담당"))
                .andExpect(jsonPath("$.contactRole").value("캐스팅 담당"));

        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "companyName": "새 컴퍼니", "description": "공연 제작사입니다." }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("새 컴퍼니"))
                .andExpect(jsonPath("$.contactName").value("김담당"))
                .andExpect(jsonPath("$.description").value("공연 제작사입니다."));
    }

    @Test
    void clearsContactRoleAndDescriptionWithBlankValue() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "contactRole": "캐스팅 담당", "description": "소개" }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "contactRole": " ", "description": "" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contactRole").doesNotExist())
                .andExpect(jsonPath("$.description").doesNotExist());
    }

    @Test
    void rejectsBlankCompanyName() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "companyName": "  " }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PRODUCER_INVALID_COMPANY_NAME"));
    }

    @Test
    void rejectsBlankContactName() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "contactName": "" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PRODUCER_INVALID_CONTACT_NAME"));
    }

    @Test
    void rejectsUpdateWithoutAnyField() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PRODUCER_INVALID_UPDATE"));
    }

    @Test
    void rejectsDescriptionLongerThanMaximum() throws Exception {
        mockMvc.perform(patch(PROFILE_PATH)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producerPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"description\": \"%s\" }".formatted("가".repeat(201))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PRODUCER_INVALID_DESCRIPTION"));
    }

    @Test
    void rejectsApplicantMember() throws Exception {
        MemberPrincipal applicant = new MemberPrincipal(999L, MemberType.APPLICANT, MemberStatus.ACTIVE);

        mockMvc.perform(get(PROFILE_PATH)
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, applicant))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get(PROFILE_PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }
}
