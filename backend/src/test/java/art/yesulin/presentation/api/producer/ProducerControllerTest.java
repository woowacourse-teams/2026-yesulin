package art.yesulin.presentation.api.producer;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.domain.member.MemberRepository;
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

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:producer-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class ProducerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @BeforeEach
    void cleanUp() {
        producerRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void signsUpProducerAsActive() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyName").value("예술인 컴퍼니"))
                .andExpect(jsonPath("$.role").value("PRODUCER"))
                .andExpect(jsonPath("$.verificationStatus").value("ACTIVE"));
    }

    @Test
    void rejectsDuplicateEmail() throws Exception {
        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(signUpRequest("producer@yesulin.art")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PRODUCER_DUPLICATE_EMAIL"));
    }

    @Test
    void rejectsMismatchedPasswordConfirm() throws Exception {
        String request = """
                {
                  "companyName": "예술인 컴퍼니",
                  "phone": "01012345678",
                  "email": "producer@yesulin.art",
                  "password": "password1234",
                  "passwordConfirm": "different1234",
                  "termsAgreed": true
                }
                """;

        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsWhenTermsNotAgreed() throws Exception {
        String request = """
                {
                  "companyName": "예술인 컴퍼니",
                  "phone": "01012345678",
                  "email": "producer@yesulin.art",
                  "password": "password1234",
                  "passwordConfirm": "password1234",
                  "termsAgreed": false
                }
                """;

        mockMvc.perform(post("/api/v1/producers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isBadRequest());
    }

    private String signUpRequest(String email) {
        return """
                {
                  "companyName": "예술인 컴퍼니",
                  "phone": "01012345678",
                  "email": "%s",
                  "password": "password1234",
                  "passwordConfirm": "password1234",
                  "termsAgreed": true
                }
                """.formatted(email);
    }
}
