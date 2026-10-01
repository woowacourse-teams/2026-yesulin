package art.yesulin.presentation.api.admin;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.social.SocialProvider;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.reservation.Booker;
import art.yesulin.domain.reservation.Reservation;
import art.yesulin.domain.reservation.ReservationRepository;
import art.yesulin.domain.show.Show;
import art.yesulin.domain.show.ShowRepository;
import art.yesulin.domain.show.ShowSession;
import art.yesulin.domain.show.ShowSessionRepository;
import art.yesulin.domain.social.SocialAccount;
import art.yesulin.domain.social.SocialAccountRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import art.yesulin.support.ShowTestFixture;
import java.time.LocalDate;
import java.time.ZoneId;
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

    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private ShowSessionRepository sessionRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private FileAssetRepository fileAssetRepository;

    @Autowired
    private FileReferenceRepository fileReferenceRepository;

    @Autowired
    private SocialAccountRepository socialAccountRepository;

    private ShowTestFixture showFixture;

    private long activeProducerId;

    @BeforeEach
    void setUp() {
        showFixture = new ShowTestFixture(
                showRepository, sessionRepository, reservationRepository, fileAssetRepository, fileReferenceRepository
        );
        showFixture.cleanUp();
        socialAccountRepository.deleteAll();
        adminAuditLogRepository.deleteAll();
        producerRepository.deleteAll();
        memberRepository.deleteAll();

        Member pending = memberRepository.save(
                new Member("pending@yesulin.art", "hash", MemberType.PRODUCER, MemberStatus.PENDING));
        producerRepository.save(new Producer(pending.getId(), "대기 기획사", "01012345678"));

        Member active = memberRepository.save(
                new Member("active@yesulin.art", "hash", MemberType.PRODUCER, MemberStatus.ACTIVE));
        producerRepository.save(new Producer(active.getId(), "활성 기획사", "01087654321"));
        activeProducerId = active.getId();

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
    void summarizesShowsAndConfirmedReservationsInOverview() throws Exception {
        // given
        Show open = showFixture.openShow(activeProducerId, 10);
        ShowSession session = showFixture.firstSession(open);
        reservationRepository.save(reservation(session, "010-1111-0001", 3));
        Reservation canceled = reservationRepository.save(reservation(session, "010-1111-0002", 2));
        canceled.cancel(ShowTestFixture.NOW);
        reservationRepository.save(canceled);
        showFixture.show(activeProducerId);

        // when & then
        mockMvc.perform(get("/api/v1/admin/overview")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shows").value(2))
                .andExpect(jsonPath("$.openShows").value(1))
                .andExpect(jsonPath("$.reservedTickets").value(3))
                .andExpect(jsonPath("$.newReservationsInLastWeek").value(1))
                .andExpect(jsonPath("$.otrAuditions").value(0))
                .andExpect(jsonPath("$.otrSubmissions").value(0));
    }

    @Test
    void summarizesSignupMethodsAndNewMembers() throws Exception {
        // given
        Member kakao = memberRepository.save(Member.ofApplicant());
        socialAccountRepository.save(new SocialAccount(kakao.getId(), SocialProvider.KAKAO, "kakao", "kakao-1"));
        Member google = memberRepository.save(Member.ofApplicant());
        socialAccountRepository.save(new SocialAccount(google.getId(), SocialProvider.GOOGLE, "google", "google-1"));

        // when & then
        mockMvc.perform(get("/api/v1/admin/member-stats")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.applicants").value(3))
                .andExpect(jsonPath("$.producers").value(2))
                .andExpect(jsonPath("$.signupMethods.kakao").value(1))
                .andExpect(jsonPath("$.signupMethods.naver").value(0))
                .andExpect(jsonPath("$.signupMethods.google").value(1))
                .andExpect(jsonPath("$.signupMethods.email").value(2))
                .andExpect(jsonPath("$.signupMethods.unknownApplicants").value(1))
                .andExpect(jsonPath("$.today.applicants").value(3))
                .andExpect(jsonPath("$.lastWeek.producers").value(2))
                .andExpect(jsonPath("$.lastMonth.applicants").value(3));
    }

    @Test
    void countsDailyActivityForLastFourteenKoreanDays() throws Exception {
        // given
        Show open = showFixture.openShow(activeProducerId, 10);
        reservationRepository.save(reservation(showFixture.firstSession(open), "010-1111-0001", 4));
        String today = LocalDate.now(ZoneId.of("Asia/Seoul")).toString();

        // when & then
        mockMvc.perform(get("/api/v1/admin/activity")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days.length()").value(14))
                .andExpect(jsonPath("$.days[13].date").value(today))
                .andExpect(jsonPath("$.days[13].applicantSignups").value(1))
                .andExpect(jsonPath("$.days[13].producerSignups").value(2))
                .andExpect(jsonPath("$.days[13].reservations").value(1))
                .andExpect(jsonPath("$.days[13].reservedTickets").value(4))
                .andExpect(jsonPath("$.days[0].applicantSignups").value(0));
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
    void listsShowsWithSessionReservationTotalsWithoutBookerDetails() throws Exception {
        // given
        Show open = showFixture.openShow(activeProducerId, 10);
        ShowSession first = showFixture.firstSession(open);
        showFixture.session(open, 5);
        reservationRepository.save(reservation(first, "010-1111-0001", 3));
        reservationRepository.save(reservation(first, "010-1111-0002", 2));
        Reservation canceled = reservationRepository.save(reservation(first, "010-1111-0003", 4));
        canceled.cancel(ShowTestFixture.NOW);
        reservationRepository.save(canceled);
        showFixture.show(activeProducerId);

        // when & then
        mockMvc.perform(get("/api/v1/admin/shows")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shows.length()").value(2))
                .andExpect(jsonPath("$.shows[1].showId").value(open.getPublicId().toString()))
                .andExpect(jsonPath("$.shows[1].status").value("OPEN"))
                .andExpect(jsonPath("$.shows[1].companyName").value("활성 기획사"))
                .andExpect(jsonPath("$.shows[1].totalCapacity").value(15))
                .andExpect(jsonPath("$.shows[1].reservedTickets").value(5))
                .andExpect(jsonPath("$.shows[1].reservationCount").value(2))
                .andExpect(jsonPath("$.shows[1].canceledReservationCount").value(1))
                .andExpect(jsonPath("$.shows[1].sessions.length()").value(2))
                .andExpect(jsonPath("$.shows[1].sessions[0].sessionId").value(first.getId()))
                .andExpect(jsonPath("$.shows[1].sessions[0].capacity").value(10))
                .andExpect(jsonPath("$.shows[1].sessions[0].reservedTickets").value(5))
                .andExpect(jsonPath("$.shows[1].sessions[1].reservedTickets").value(0))
                .andExpect(jsonPath("$.shows[1].sessions[1].reservationCount").value(0))
                .andExpect(jsonPath("$.shows[0].status").value("DRAFT"))
                .andExpect(jsonPath("$.shows[0].sessions.length()").value(0))
                .andExpect(content().string(not(containsString("홍길동"))))
                .andExpect(content().string(not(containsString("010-1111-0001"))));
    }

    @Test
    void filtersShowsByStatus() throws Exception {
        showFixture.openShow(activeProducerId, 10);
        showFixture.show(activeProducerId);

        mockMvc.perform(get("/api/v1/admin/shows")
                        .param("status", "OPEN")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shows.length()").value(1))
                .andExpect(jsonPath("$.shows[0].status").value("OPEN"));
    }

    @Test
    void listsAuditLogsInPagesOfTen() throws Exception {
        // given
        for (int index = 1; index <= 12; index++) {
            adminAuditLogRepository.save(new AdminAuditLog(
                    ADMIN.memberId(),
                    AdminAction.MEMBER_STATUS_CHANGED,
                    "MEMBER",
                    index,
                    "PENDING -> ACTIVE"
            ));
        }

        // when & then
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .param("page", "1")
                        .sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logs.length()").value(2))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(12))
                .andExpect(jsonPath("$.totalPages").value(2));
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

    private static Reservation reservation(ShowSession session, String phone, int ticketCount) {
        return new Reservation(session.getId(), new Booker("홍길동", phone), ticketCount, "test-privacy-v1");
    }
}
