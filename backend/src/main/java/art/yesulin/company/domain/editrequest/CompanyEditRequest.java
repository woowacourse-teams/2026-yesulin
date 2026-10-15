package art.yesulin.company.domain.editrequest;

import static art.yesulin.company.domain.CompanyErrorCode.EDIT_REQUEST_RESOLVED;
import static art.yesulin.company.domain.CompanyErrorCode.INVALID_INPUT;
import static art.yesulin.global.validation.DomainValidator.requirePositive;

import art.yesulin.company.domain.Company;
import art.yesulin.company.domain.CompanyAddress;
import art.yesulin.company.domain.CompanyProfile;
import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공개된 공연사 화면에서 누구나 보낸 정보 수정 요청. 요청한 정보 전체를 그대로 담고, 운영자가 바뀐 항목을 확인해 적용하거나
 * 반려한다. 요청자 연락처는 확인 연락에만 쓰고 처리하면 지운다.
 */
@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "company_edit_requests")
public class CompanyEditRequest {

    public static final int MAX_REASON_LENGTH = 1000;
    public static final int MAX_CONTACT_LENGTH = 100;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private long companyId;

    @Column(nullable = false, length = Company.MAX_NAME_LENGTH)
    private String name;

    @Column(name = "representative_name", length = Company.MAX_REPRESENTATIVE_NAME_LENGTH)
    private String representativeName;

    @Column(name = "representative_name_public", nullable = false)
    private boolean representativeNamePublic;

    @ElementCollection
    @CollectionTable(name = "company_edit_request_links", joinColumns = @JoinColumn(name = "request_id"))
    @OrderColumn(name = "link_order")
    @Column(name = "url", nullable = false, length = Company.MAX_LINK_LENGTH)
    private List<String> links = new ArrayList<>();

    @Column(name = "founded_on")
    private LocalDate foundedOn;

    @Embedded
    private CompanyAddress address;

    @Column(name = "address_public", nullable = false)
    private boolean addressPublic;

    @Column(length = Company.MAX_REGION_LENGTH)
    private String region;

    @Column(length = Company.MAX_PHONE_LENGTH)
    private String phone;

    @Column(length = Company.MAX_DESCRIPTION_LENGTH)
    private String description;

    @Column(length = Company.MAX_HISTORY_LENGTH)
    private String history;

    /** 요청과 함께 보낸 사진의 비공개 저장소 키. 사진을 바꾸지 않았거나 지워 달라고 했으면 null이다. */
    @Column(name = "photo_key", length = 500)
    private String photoKey;

    /** 요청자가 바꾼 항목. {@link CompanyField} 이름을 쉼표로 이어 저장한다. */
    @Getter(AccessLevel.NONE)
    @Column(name = "changed_fields", nullable = false, length = 200)
    private String changedFields;

    /** 무엇을 왜 고쳐 달라는지. 운영자가 사실을 확인하는 근거다. */
    @Column(nullable = false, length = MAX_REASON_LENGTH)
    private String reason;

    /** 요청자가 남긴 이메일이나 전화번호. 처리하면 지운다. 요청 사진 키도 처리하면 지운다. */
    @Column(length = MAX_CONTACT_LENGTH)
    private String contact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompanyEditRequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    /**
     * 요청을 받는다. 요청한 정보는 공연사 정보와 같은 규칙으로 확인한다.
     *
     * @param companyId 고쳐 달라는 공연사
     * @param proposal 요청한 공연사 정보. 정보 출처 메모는 받지 않는다.
     * @param changedFields 요청자가 바꾼 항목. 하나 이상이어야 한다.
     */
    public CompanyEditRequest(
            long companyId,
            CompanyProfile proposal,
            Set<CompanyField> changedFields,
            String reason,
            String contact,
            LocalDate today,
            Instant now
    ) {
        this.companyId = requirePositive(companyId, "공연사 ID는 1 이상이어야 합니다.");
        CompanyProfile normalized = Company.normalize(proposal, today);
        this.name = normalized.name();
        this.representativeName = normalized.representativeName();
        this.representativeNamePublic = normalized.representativeNamePublic();
        this.links.addAll(normalized.links());
        this.foundedOn = normalized.foundedOn();
        this.address = normalized.address();
        this.addressPublic = normalized.addressPublic();
        this.region = normalized.region();
        this.phone = normalized.phone();
        this.description = normalized.description();
        this.history = normalized.history();
        this.changedFields = joined(changedFields);
        this.reason = required(reason, MAX_REASON_LENGTH, "요청 사유");
        this.contact = optional(contact, MAX_CONTACT_LENGTH, "연락처");
        this.status = CompanyEditRequestStatus.PENDING;
        this.createdAt = now;
    }

    /** 요청한 공연사 정보. 정보 출처 메모는 비어 있다. */
    public CompanyProfile proposal() {
        return new CompanyProfile(
                name, representativeName, representativeNamePublic, List.copyOf(links), foundedOn, address,
                addressPublic, region, phone, description, history, null
        );
    }

    /** 요청과 함께 보낸 사진을 단다. 사진을 바꾼 요청에만 달 수 있다. */
    public void attachPhoto(String photoKey) {
        if (!changedFields().contains(CompanyField.PHOTO)) {
            throw new BusinessException(INVALID_INPUT, "사진을 바꾼 요청에만 사진을 달 수 있습니다.");
        }
        this.photoKey = photoKey;
    }

    /** 사진을 바꿔 달라는 요청인지. 사진이 없으면 지워 달라는 뜻이다. */
    public boolean requestsPhotoChange() {
        return changedFields().contains(CompanyField.PHOTO);
    }

    /** 요청자가 바꾼 항목. 항목 순서대로 준다. */
    public Set<CompanyField> changedFields() {
        return Arrays.stream(changedFields.split(","))
                .map(CompanyField::valueOf)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(CompanyField.class)));
    }

    public void apply(long adminId, Instant now) {
        resolve(CompanyEditRequestStatus.APPLIED, adminId, now);
    }

    public void reject(long adminId, Instant now) {
        resolve(CompanyEditRequestStatus.REJECTED, adminId, now);
    }

    private void resolve(CompanyEditRequestStatus next, long adminId, Instant now) {
        if (status != CompanyEditRequestStatus.PENDING) {
            throw new BusinessException(EDIT_REQUEST_RESOLVED, "이미 처리한 수정 요청입니다.");
        }
        this.status = next;
        this.resolvedBy = requirePositive(adminId, "처리한 운영자 ID는 1 이상이어야 합니다.");
        this.resolvedAt = now;
        this.contact = null;
        this.photoKey = null;
    }

    private static String joined(Set<CompanyField> fields) {
        if (fields == null || fields.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "바꾼 항목이 없습니다.");
        }
        return EnumSet.copyOf(fields).stream().map(Enum::name).collect(Collectors.joining(","));
    }

    private static String required(String value, int maxLength, String label) {
        String normalized = optional(value, maxLength, label);
        if (normalized == null) {
            throw new BusinessException(INVALID_INPUT, "%s은(는) 필수입니다.", label);
        }
        return normalized;
    }

    private static String optional(String value, int maxLength, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, "%s은(는) %d자 이내여야 합니다.", label, maxLength);
        }
        return normalized;
    }
}
