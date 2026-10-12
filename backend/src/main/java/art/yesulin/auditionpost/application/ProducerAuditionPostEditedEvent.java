package art.yesulin.auditionpost.application;

import java.util.List;

/** 기획사가 공고를 고쳤다. 바뀐 항목이 있을 때만 발행하며 고친 내용은 담지 않는다. */
public record ProducerAuditionPostEditedEvent(
        long postId,
        String companyName,
        String title,
        List<AuditionPostChange> changes
) {
}
