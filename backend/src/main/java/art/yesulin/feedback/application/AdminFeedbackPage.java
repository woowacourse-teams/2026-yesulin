package art.yesulin.feedback.application;

import java.util.List;

public record AdminFeedbackPage(List<AdminFeedbackItem> items, boolean hasNext) {
}
