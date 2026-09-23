package art.yesulin.domain.otraudition;

import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionCareer;
import art.yesulin.domain.submission.SubmissionEducationLevel;
import art.yesulin.domain.submission.SubmissionType;
import art.yesulin.domain.submission.converter.MilitaryServiceStatusConverter;
import art.yesulin.domain.submission.converter.SubmissionEducationLevelConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "otr_submissions", uniqueConstraints = @UniqueConstraint(
        name = "uk_otr_submissions_audition_applicant", columnNames = {"otr_audition_id", "applicant_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OtrSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "otr_audition_id", nullable = false, updatable = false)
    private long otrAuditionId;

    @Column(name = "applicant_id", nullable = false, updatable = false)
    private long applicantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "submission_type", nullable = false, updatable = false, length = 20)
    private SubmissionType type = SubmissionType.OTR;

    @Column(name = "selected_role", nullable = false, updatable = false, length = 100)
    private String selectedRole;

    @Embedded
    private SubmissionBasicInformation basicInformation;

    @Column(name = "additional_information_present", nullable = false, updatable = false)
    private boolean additionalInformationPresent = true;

    @Convert(converter = SubmissionEducationLevelConverter.class)
    @Column(name = "education_level", updatable = false, length = 20)
    private SubmissionEducationLevel educationLevel;

    @Column(name = "school", updatable = false, length = 255)
    private String school;

    @Column(name = "major", updatable = false, length = 255)
    private String major;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "otr_submission_links", joinColumns = @JoinColumn(name = "otr_submission_id"))
    @OrderColumn(name = "link_order")
    @Column(name = "url", nullable = false, length = 255)
    private List<String> links = new ArrayList<>();

    @Column(name = "nationality", updatable = false, length = 100)
    private String nationality;

    @Column(name = "cover_letter", updatable = false, length = 2000)
    private String coverLetter;

    @Column(name = "specialty", updatable = false, length = 255)
    private String specialty;

    @Column(name = "hobbies", updatable = false, length = 255)
    private String hobbies;

    @Convert(converter = MilitaryServiceStatusConverter.class)
    @Column(name = "military_service_status", updatable = false, length = 20)
    private MilitaryServiceStatus militaryServiceStatus;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "otr_submission_careers", joinColumns = @JoinColumn(name = "otr_submission_id"))
    @OrderColumn(name = "career_order")
    private List<SubmissionCareer> careers = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "otr_submission_photos", joinColumns = @JoinColumn(name = "otr_submission_id"))
    @OrderColumn(name = "photo_order")
    @Column(name = "file_id", nullable = false)
    private List<Long> photoFileIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "otr_submission_videos", joinColumns = @JoinColumn(name = "otr_submission_id"))
    @OrderColumn(name = "video_order")
    @Column(name = "video_url", nullable = false, length = 255)
    private List<String> videoUrls = new ArrayList<>();

    @Column(name = "recipient_name", nullable = false, updatable = false, length = 255)
    private String recipientName;

    @Column(name = "privacy_document_version", nullable = false, updatable = false, length = 100)
    private String privacyDocumentVersion;

    @Column(name = "third_party_document_version", nullable = false, updatable = false, length = 100)
    private String thirdPartyDocumentVersion;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    public OtrSubmission(long otrAuditionId, long applicantId, String selectedRole,
            SubmissionBasicInformation basicInformation, SubmissionAdditionalInformation additionalInformation,
            List<Long> photoFileIds, List<String> videoUrls,
            String recipientName, String privacyDocumentVersion, String thirdPartyDocumentVersion,
            Instant submittedAt) {
        this.otrAuditionId = otrAuditionId;
        this.applicantId = applicantId;
        this.selectedRole = selectedRole;
        this.basicInformation = basicInformation;
        this.educationLevel = additionalInformation.educationLevel();
        this.school = additionalInformation.school();
        this.major = additionalInformation.major();
        this.links = new ArrayList<>(additionalInformation.links());
        this.nationality = additionalInformation.nationality();
        this.coverLetter = additionalInformation.coverLetter();
        this.specialty = additionalInformation.specialty();
        this.hobbies = additionalInformation.hobbies();
        this.militaryServiceStatus = additionalInformation.military();
        this.careers = new ArrayList<>(additionalInformation.careers());
        this.photoFileIds = new ArrayList<>(photoFileIds);
        this.videoUrls = new ArrayList<>(videoUrls);
        this.recipientName = recipientName;
        this.privacyDocumentVersion = privacyDocumentVersion;
        this.thirdPartyDocumentVersion = thirdPartyDocumentVersion;
        this.submittedAt = submittedAt;
    }
}
