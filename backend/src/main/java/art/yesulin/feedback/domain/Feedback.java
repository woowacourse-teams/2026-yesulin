package art.yesulin.feedback.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 화면에서 보낸 의견 한 건. 보낸 뒤에는 바꾸지 않는다. */
@Getter
@Entity
@Table(name = "feedbacks")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feedback {

    public static final int CONTENT_MAX = 1000;
    public static final int CONTACT_MAX = 100;
    public static final int PAGE_PATH_MAX = 300;
    public static final int USER_AGENT_MAX = 300;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private FeedbackType type;

    @Column(nullable = false, length = CONTENT_MAX, updatable = false)
    private String content;

    @Column(nullable = false, length = CONTACT_MAX, updatable = false)
    private String contact;

    @Column(nullable = false, length = PAGE_PATH_MAX, updatable = false)
    private String pagePath;

    @Column(nullable = false, length = USER_AGENT_MAX, updatable = false)
    private String userAgent;

    @Column(updatable = false)
    private Long memberId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @ElementCollection
    @CollectionTable(name = "feedback_images", joinColumns = @JoinColumn(name = "feedback_id"))
    @OrderColumn(name = "sort_order")
    private List<FeedbackImage> images = new ArrayList<>();

    public Feedback(FeedbackType type, String content, String contact, FeedbackPage page, Long memberId,
                    Instant createdAt) {
        this(type, content, contact, page, memberId, createdAt, List.of());
    }

    public Feedback(FeedbackType type, String content, String contact, FeedbackPage page, Long memberId,
                    Instant createdAt, List<FeedbackImage> images) {
        this.type = Objects.requireNonNull(type);
        this.content = FeedbackText.required(content, CONTENT_MAX);
        this.contact = FeedbackText.optional(contact, CONTACT_MAX);
        this.pagePath = page.path();
        this.userAgent = page.userAgent();
        this.memberId = memberId;
        this.createdAt = Objects.requireNonNull(createdAt);
        this.images = new ArrayList<>(images);
    }

    public List<FeedbackImage> getImages() {
        return List.copyOf(images);
    }

    public int imageCount() {
        return images.size();
    }

    public boolean hasContact() {
        return !contact.isEmpty();
    }
}
