package art.yesulin.presentation.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
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
        "spring.datasource.url=jdbc:h2:mem:admin-member-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
@AutoConfigureMockMvc
class AdminMemberControllerTest {

    private static final MemberPrincipal ADMIN = new MemberPrincipal(1L, MemberType.ADMIN, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    private long producerMemberId;

    @BeforeEach
    void setUp() {
        adminAuditLogRepository.deleteAll();
        memberRepository.deleteAll();
        Member producer = memberRepository.save(
                new Member("producer@yesulin.art", "hash", MemberType.PRODUCER, MemberStatus.PENDING));
        producerMemberId = producer.getId();
    }

    @Test
    void activatesPendingProducer() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/members/{memberId}/status", producerMemberId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "ACTIVE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberId").value(producerMemberId))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        assertEquals(
                MemberStatus.ACTIVE, memberRepository.findById(producerMemberId).orElseThrow().getStatus());
    }

    @Test
    void recordsAuditLogOnStatusChange() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/members/{memberId}/status", producerMemberId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "ACTIVE"}
                                """))
                .andExpect(status().isOk());

        List<AdminAuditLog> logs = adminAuditLogRepository.findAll();
        assertEquals(1, logs.size());
        assertEquals(ADMIN.memberId(), logs.getFirst().getActorMemberId());
        assertEquals(producerMemberId, logs.getFirst().getTargetId());
        assertEquals("PENDING -> ACTIVE", logs.getFirst().getDetail());
    }

    @Test
    void rejectsProducerSession() throws Exception {
        MemberPrincipal producer = new MemberPrincipal(9L, MemberType.PRODUCER, MemberStatus.ACTIVE);

        mockMvc.perform(patch("/api/v1/admin/members/{memberId}/status", producerMemberId)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, producer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "ACTIVE"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void rejectsAnonymousRequest() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/members/{memberId}/status", producerMemberId)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "ACTIVE"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_UNAUTHENTICATED"));
    }

    @Test
    void rejectsStatusChangeOnApplicant() throws Exception {
        Member applicant = memberRepository.save(Member.ofApplicant());

        mockMvc.perform(patch("/api/v1/admin/members/{memberId}/status", applicant.getId())
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "PENDING"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_STATUS_CHANGE_NOT_ALLOWED"));
    }

    @Test
    void rejectsUnknownMember() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/members/{memberId}/status", 999999L)
                        .with(csrf())
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status": "ACTIVE"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
    }
}
