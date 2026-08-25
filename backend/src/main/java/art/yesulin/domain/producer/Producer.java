package art.yesulin.domain.producer;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "producers")
public class Producer {

    private static final int MAX_COMPANY_NAME_LENGTH = 100;
    private static final int MAX_CONTACT_NAME_LENGTH = 50;
    private static final int MAX_CONTACT_ROLE_LENGTH = 50;
    private static final int MAX_DESCRIPTION_LENGTH = 200;
    private static final String PHONE_PATTERN = "^01\\d{8,9}$";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false, updatable = false)
    private long memberId;

    @Column(name = "company_name", nullable = false, length = MAX_COMPANY_NAME_LENGTH)
    private String companyName;

    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @Column(name = "contact_name", length = MAX_CONTACT_NAME_LENGTH)
    private String contactName;

    @Column(name = "contact_role", length = MAX_CONTACT_ROLE_LENGTH)
    private String contactRole;

    @Column(name = "description", length = MAX_DESCRIPTION_LENGTH)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Producer(long memberId, String companyName, String phone) {
        this.memberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        this.companyName = normalizeCompanyName(companyName);
        this.phone = normalizePhone(phone);
    }

    public void updateCompanyName(String value) {
        this.companyName = normalizeCompanyName(value);
    }

    public void updateContactName(String value) {
        String contactName = normalizeNullableText(value);
        if (contactName == null) {
            throw new BusinessException(ProducerErrorCode.INVALID_CONTACT_NAME, "담당자명을 입력해 주세요.");
        }
        if (contactName.length() > MAX_CONTACT_NAME_LENGTH) {
            throw new BusinessException(ProducerErrorCode.INVALID_CONTACT_NAME, "담당자명이 너무 깁니다.");
        }
        this.contactName = contactName;
    }

    /** 빈 값을 보내면 담당 업무를 지운다. */
    public void updateContactRole(String value) {
        String contactRole = normalizeNullableText(value);
        if (contactRole != null && contactRole.length() > MAX_CONTACT_ROLE_LENGTH) {
            throw new BusinessException(ProducerErrorCode.INVALID_CONTACT_ROLE, "담당 업무가 너무 깁니다.");
        }
        this.contactRole = contactRole;
    }

    /** 빈 값을 보내면 소개를 지운다. */
    public void updateDescription(String value) {
        String description = normalizeNullableText(value);
        if (description != null && description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new BusinessException(ProducerErrorCode.INVALID_DESCRIPTION, "소개는 200자 이내로 적어 주세요.");
        }
        this.description = description;
    }

    private static String normalizeCompanyName(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(ProducerErrorCode.INVALID_COMPANY_NAME, "기획사·제작사명이 필요합니다.");
        }
        String companyName = value.trim();
        if (companyName.length() > MAX_COMPANY_NAME_LENGTH) {
            throw new BusinessException(ProducerErrorCode.INVALID_COMPANY_NAME, "기획사·제작사명이 너무 깁니다.");
        }
        return companyName;
    }

    private static String normalizeNullableText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String normalizePhone(String value) {
        String phone = requireText(value, "휴대폰 번호가 필요합니다.").replaceAll("\\D", "");
        if (!phone.matches(PHONE_PATTERN)) {
            throw new BusinessException(ProducerErrorCode.INVALID_PHONE, "올바른 휴대폰 번호가 아닙니다.");
        }
        return phone;
    }
}
