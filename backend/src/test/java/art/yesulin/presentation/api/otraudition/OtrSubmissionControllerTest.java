package art.yesulin.presentation.api.otraudition;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import art.yesulin.application.audition.PostingSnapshotVersionGenerator;
import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.submission.SubmissionType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:otr-submission-api;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import({ObjectStorageTestConfiguration.class, OtrSubmissionControllerTest.FixedClockConfiguration.class})
@AutoConfigureMockMvc
class OtrSubmissionControllerTest {

    private static final MemberPrincipal APPLICANT = new MemberPrincipal(1L, MemberType.APPLICANT, MemberStatus.ACTIVE);
    private static final MemberPrincipal PRODUCER = new MemberPrincipal(2L, MemberType.PRODUCER, MemberStatus.ACTIVE);

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private OtrAuditionRepository auditionRepository;
    @Autowired
    private OtrSubmissionRepository submissionRepository;
    @Autowired
    private ProducerRepository producerRepository;
    @Autowired
    private FileAssetRepository fileAssetRepository;
    @Autowired
    private PostingSnapshotVersionGenerator snapshotVersionGenerator;

    @BeforeEach
    void cleanUp() {
        submissionRepository.deleteAll();
        fileAssetRepository.deleteAll();
        auditionRepository.deleteAll();
        producerRepository.deleteAll();
        producerRepository.saveAndFlush(new Producer(2L, "극단 예술인", "01012345678"));
    }

    @Test
    void publicLinkOpensFormAndSubmissionPersistsOtrType() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 21));
        List<Long> files = createPhotos();
        String url = "/api/v1/otr-auditions/" + audition.getPublicId() + "/submissions";

        mockMvc.perform(get("/api/v1/public/otr-auditions/{id}", audition.getPublicId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true))
                .andExpect(jsonPath("$.producerName").value("극단 예술인"))
                .andExpect(jsonPath("$.roles[0]").value("햄릿"));

        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.submissionId").isNumber());

        assertEquals(SubmissionType.OTR, submissionRepository.findAll().getFirst().getType());

        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OTR_AUDITION_DUPLICATE_SUBMISSION"));
    }

    @Test
    void rejectsExpiredAuditionAndInvalidRole() throws Exception {
        OtrAudition closed = createAudition(LocalDate.of(2026, 9, 20));
        List<Long> files = createPhotos();
        mockMvc.perform(get("/api/v1/public/otr-auditions/{id}", closed.getPublicId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.open").value(false));
        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", closed.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(closed, files, "햄릿")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("OTR_AUDITION_CLOSED"));

        OtrAudition open = createAudition(LocalDate.of(2026, 9, 22));
        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", open.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(open, files, "다른 배역")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("OTR_AUDITION_INVALID_INPUT"));
    }

    @Test
    void acceptsOptionalMediaAndRejectsMoreThanThreeOrNonApplicant() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 22));
        List<Long> files = createPhotos();
        String url = "/api/v1/otr-auditions/" + audition.getPublicId() + "/submissions";
        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(audition, files, "햄릿")
                                .replace("[%d,%d,%d]".formatted(files.get(0), files.get(1), files.get(2)), "[]")
                                .replace("[\"https://youtu.be/aaaaaaaaaaa\", \"https://youtu.be/bbbbbbbbbbb\", "
                                        + "\"https://youtu.be/ccccccccccc\"]", "[]")))
                .andExpect(status().isCreated());
        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request(audition, files, "햄릿")
                                .replace("[%d,%d,%d]".formatted(files.get(0), files.get(1), files.get(2)),
                                        "[%d,%d,%d,%d]".formatted(files.get(0), files.get(1), files.get(2),
                                                files.get(0)))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post(url).with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, PRODUCER)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsSubmissionIfConsentRecipientChangedAfterPageLoad() throws Exception {
        OtrAudition audition = createAudition(LocalDate.of(2026, 9, 22));
        List<Long> files = createPhotos();
        Producer producer = producerRepository.findByMemberId(2L).orElseThrow();
        producer.updateCompanyName("새 공연사명");
        producerRepository.saveAndFlush(producer);

        mockMvc.perform(post("/api/v1/otr-auditions/{id}/submissions", audition.getPublicId())
                        .with(csrf()).sessionAttr(MemberPrincipal.SESSION_ATTRIBUTE, APPLICANT)
                        .contentType(MediaType.APPLICATION_JSON).content(request(audition, files, "햄릿")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("OTR_AUDITION_STALE_POSTING_SNAPSHOT"));
    }

    private OtrAudition createAudition(LocalDate deadline) {
        String otrId = deadline.format(DateTimeFormatter.BASIC_ISO_DATE);
        return auditionRepository.saveAndFlush(new OtrAudition(2L, otrId, "햄릿 배우 모집",
                List.of("햄릿", "오필리어"), deadline));
    }

    private List<Long> createPhotos() {
        return List.of(1, 2, 3).stream().map(index -> {
            FileAsset file = new FileAsset("private/actor-photos/test-" + index, 1L,
                    new FileMetadata("photo.jpg", "image/jpeg", 1024L));
            file.completeUpload("image/jpeg", 1024L);
            return fileAssetRepository.saveAndFlush(file).getId();
        }).toList();
    }

    private String request(OtrAudition audition, List<Long> fileIds, String role) {
        return """
                {
                  "type": "OTR",
                  "selectedRole": "%s",
                  "postingSnapshotVersion": "%s",
                  "basicInformation": {
                    "name": "홍길동", "height": 175, "weight": 67, "birthDate": "2000-01-01",
                    "gender": "MALE", "phone": "010-1234-5678", "email": "actor@example.com", "address": "서울특별시 종로구"
                  },
                  "additionalInformation": {
                    "educationLevel": "UNIVERSITY", "school": "한국예술종합학교", "major": "연기과",
                    "links": ["https://example.com/actor"], "nationality": "대한민국", "coverLetter": "자기소개",
                    "specialty": "현대무용", "hobbies": "영화 감상", "militaryServiceStatus": "NOT_APPLICABLE",
                    "careers": [{"year": 2025, "title": "햄릿", "roleName": "오필리어"}]
                  },
                  "photoFileIds": [%d,%d,%d],
                  "videoUrls": ["https://youtu.be/aaaaaaaaaaa", "https://youtu.be/bbbbbbbbbbb", "https://youtu.be/ccccccccccc"],
                  "privacyCollectionAndUseAgreed": true, "thirdPartyProvisionAgreed": true
                }
                """.formatted(role,
                snapshotVersionGenerator.generate(audition.getPublicId(), "극단 예술인"),
                fileIds.get(0), fileIds.get(1), fileIds.get(2));
    }

    @TestConfiguration
    static class FixedClockConfiguration {

        @Bean
        @Primary
        Clock fixedOtrClock() {
            return Clock.fixed(Instant.parse("2026-09-21T14:59:59Z"), ZoneOffset.UTC);
        }
    }
}
