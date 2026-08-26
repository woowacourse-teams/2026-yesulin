package art.yesulin.presentation.api.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-dashboard-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminDashboardControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @BeforeEach
    void setUp() {
        producerRepository.deleteAll();
        memberRepository.deleteAll();

        Member pending = memberRepository.save(
                new Member("pending@yesulin.art", "hash", MemberType.PRODUCER, MemberStatus.PENDING));
        producerRepository.save(new Producer(pending.getId(), "대기 기획사", "01012345678"));

        Member active = memberRepository.save(
                new Member("active@yesulin.art", "hash", MemberType.PRODUCER, MemberStatus.ACTIVE));
        producerRepository.save(new Producer(active.getId(), "활성 기획사", "01087654321"));

        memberRepository.save(Member.ofApplicant());
    }

    @Test
    void summarizesCurrentDatabase() throws Exception {
        mockMvc.perform(get("/api/v1/admin/overview")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicants").value(1))
                .andExpect(jsonPath("$.producers").value(2))
                .andExpect(jsonPath("$.pendingProducers").value(1))
                .andExpect(jsonPath("$.activeProducers").value(1))
                .andExpect(jsonPath("$.auditions").value(0))
                .andExpect(jsonPath("$.submissions").value(0));
    }

    @Test
    void listsProducersWithCompanyInformation() throws Exception {
        mockMvc.perform(get("/api/v1/admin/producers")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.producers.length()").value(2))
                .andExpect(jsonPath("$.producers[0].status").value("PENDING"))
                .andExpect(jsonPath("$.producers[0].companyName").value("대기 기획사"))
                .andExpect(jsonPath("$.producers[0].performanceCount").value(0));
    }

    @Test
    void filtersProducersByStatus() throws Exception {
        mockMvc.perform(get("/api/v1/admin/producers")
                        .param("status", "ACTIVE")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.producers.length()").value(1))
                .andExpect(jsonPath("$.producers[0].companyName").value("활성 기획사"));
    }

    @Test
    void listsAuditionsAndAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/admin/auditions")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditions.length()").value(0));

        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logs.length()").value(0));
    }

    @Test
    void rejectsNonAdminSession() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/admin/overview")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsAnonymousRequest() throws Exception {
        mockMvc.perform(get("/api/v1/admin/overview"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }
}
