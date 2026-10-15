package art.yesulin.company.domain;

import static art.yesulin.company.domain.CompanyErrorCode.INVALID_INPUT;
import static art.yesulin.global.validation.DomainValidator.requirePositive;

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
import java.net.URI;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공고를 올린 공연사(극단·제작사·기획사)의 공개 정보. 기획사 계정과 따로 있어 계정 없는 공연사도 운영자가 만들 수 있다.
 * 운영자가 공개하기 전에는 공고와 공연사 화면 어디에도 보이지 않는다.
 */
@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "companies")
public class Company {

    public static final int MAX_NAME_LENGTH = 100;
    public static final int MAX_REPRESENTATIVE_NAME_LENGTH = 50;
    public static final int MAX_LINKS = 3;
    public static final int MAX_LINK_LENGTH = 500;
    public static final int MAX_REGION_LENGTH = 50;
    public static final int MAX_PHONE_LENGTH = 30;
    public static final int MAX_DESCRIPTION_LENGTH = 2000;
    public static final int MAX_HISTORY_LENGTH = 2000;
    public static final int MAX_SOURCE_NOTE_LENGTH = 1000;
    private static final LocalDate EARLIEST_FOUNDED_ON = LocalDate.of(1900, 1, 1);
    private static final Pattern PHONE = Pattern.compile("[0-9][0-9 ()+-]{6,29}");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(name = "representative_name", length = MAX_REPRESENTATIVE_NAME_LENGTH)
    private String representativeName;

    /** 대표자 이름은 개인정보라 공연사가 공개에 동의했을 때만 공개한다. */
    @Column(name = "representative_name_public", nullable = false)
    private boolean representativeNamePublic;

    /** 홈페이지·SNS 같은 공연사 링크. 최대 {@link #MAX_LINKS}개이고 적은 순서대로 보여 준다. */
    @ElementCollection
    @CollectionTable(name = "company_links", joinColumns = @JoinColumn(name = "company_id"))
    @OrderColumn(name = "link_order")
    @Column(name = "url", nullable = false, length = MAX_LINK_LENGTH)
    private List<String> links = new ArrayList<>();

    @Column(name = "founded_on")
    private LocalDate foundedOn;

    @Embedded
    private CompanyAddress address;

    /** 상세 주소와 지도를 공개할지. 집 주소일 수 있는 주소는 시·군·구까지만 보인다. */
    @Column(name = "address_public", nullable = false)
    private boolean addressPublic;

    @Column(length = MAX_REGION_LENGTH)
    private String region;

    @Column(length = MAX_PHONE_LENGTH)
    private String phone;

    @Column(length = MAX_DESCRIPTION_LENGTH)
    private String description;

    @Column(length = MAX_HISTORY_LENGTH)
    private String history;

    /** 정보를 확인한 출처. 운영자만 본다. */
    @Column(name = "source_note", length = MAX_SOURCE_NOTE_LENGTH)
    private String sourceNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompanyStatus status;

    @Column(name = "created_by", nullable = false, updatable = false)
    private long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Company(CompanyProfile profile, long createdBy, LocalDate today, Instant now) {
        this.createdBy = requirePositive(createdBy, "만든 사람 ID는 1 이상이어야 합니다.");
        this.status = CompanyStatus.PENDING;
        this.createdAt = now;
        apply(profile, today, now);
    }

    public void update(CompanyProfile profile, LocalDate today, Instant now) {
        apply(profile, today, now);
    }

    /** 공개하거나 내린다. 공개 여부를 정한 정보를 검토 전으로 되돌리지는 않는다. */
    public void changeStatus(CompanyStatus status, Instant now) {
        if (status == null) {
            throw invalid("공개 상태는 필수입니다.");
        }
        if (status == CompanyStatus.PENDING && this.status != CompanyStatus.PENDING) {
            throw invalid("공개 여부를 정한 공연사는 검토 전으로 돌릴 수 없습니다.");
        }
        if (this.status != status) {
            this.status = status;
            this.updatedAt = now;
        }
    }

    public boolean isPublished() {
        return status == CompanyStatus.PUBLISHED;
    }

    /** 공개 화면에 보일 대표자 이름. 공개 동의가 없으면 null이다. */
    public String publicRepresentativeName() {
        return representativeNamePublic ? representativeName : null;
    }

    /** 공개 화면에 보일 주소. 상세 주소 공개를 정하지 않았으면 null이고 위치는 시·군·구까지만 보인다. */
    public CompanyAddress publicAddress() {
        return addressPublic ? address : null;
    }

    /** 공고 카드의 위치. 주소가 있으면 시·군·구까지, 없으면 지역을 쓴다. 둘 다 없으면 null이다. */
    public String locationSummary() {
        if (address != null) {
            return address.district();
        }
        return region;
    }

    /** 공연사 정보 규칙에 맞는지 확인하고 앞뒤 공백·빈 칸·같은 링크를 정리한다. 수정 요청도 같은 규칙으로 받는다. */
    public static CompanyProfile normalize(CompanyProfile profile, LocalDate today) {
        if (profile == null) {
            throw invalid("공연사 정보는 필수입니다.");
        }
        String name = optional(profile.name(), MAX_NAME_LENGTH, "공연사 이름");
        if (name == null) {
            throw invalid("공연사 이름은 필수입니다.");
        }
        return new CompanyProfile(
                name,
                optional(profile.representativeName(), MAX_REPRESENTATIVE_NAME_LENGTH, "대표자 이름"),
                profile.representativeNamePublic(),
                links(profile.links()),
                foundedOn(profile.foundedOn(), today),
                profile.address(),
                profile.addressPublic(),
                optional(profile.region(), MAX_REGION_LENGTH, "지역"),
                phone(profile.phone()),
                optional(profile.description(), MAX_DESCRIPTION_LENGTH, "소개"),
                optional(profile.history(), MAX_HISTORY_LENGTH, "연혁"),
                optional(profile.sourceNote(), MAX_SOURCE_NOTE_LENGTH, "정보 출처")
        );
    }

    private void apply(CompanyProfile profile, LocalDate today, Instant now) {
        CompanyProfile normalized = normalize(profile, today);
        this.name = normalized.name();
        this.representativeName = normalized.representativeName();
        this.representativeNamePublic = normalized.representativeNamePublic();
        this.links.clear();
        this.links.addAll(normalized.links());
        this.foundedOn = normalized.foundedOn();
        this.address = normalized.address();
        this.addressPublic = normalized.addressPublic();
        this.region = normalized.region();
        this.phone = normalized.phone();
        this.description = normalized.description();
        this.history = normalized.history();
        this.sourceNote = normalized.sourceNote();
        this.updatedAt = now;
    }

    /** 빈 칸은 빼고 같은 주소는 한 번만 둔다. */
    private static List<String> links(List<String> values) {
        if (values == null) {
            return List.of();
        }
        Set<String> links = new LinkedHashSet<>();
        for (String value : values) {
            String link = optional(value, MAX_LINK_LENGTH, "링크");
            if (link == null) {
                continue;
            }
            if (!isWebAddress(link)) {
                throw invalid("링크는 http:// 또는 https://로 시작하는 주소여야 합니다.");
            }
            links.add(link);
        }
        if (links.size() > MAX_LINKS) {
            throw invalid("링크는 %d개까지 넣을 수 있습니다.".formatted(MAX_LINKS));
        }
        return List.copyOf(links);
    }

    private static boolean isWebAddress(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            return (scheme.equals("http") || scheme.equals("https")) && uri.getHost() != null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static LocalDate foundedOn(LocalDate value, LocalDate today) {
        if (value != null && (value.isBefore(EARLIEST_FOUNDED_ON) || value.isAfter(today))) {
            throw invalid("설립일이 올바르지 않습니다.");
        }
        return value;
    }

    private static String phone(String value) {
        String phone = optional(value, MAX_PHONE_LENGTH, "연락처");
        if (phone != null && !PHONE.matcher(phone).matches()) {
            throw invalid("연락처는 숫자와 하이픈으로 적어 주세요.");
        }
        return phone;
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

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
