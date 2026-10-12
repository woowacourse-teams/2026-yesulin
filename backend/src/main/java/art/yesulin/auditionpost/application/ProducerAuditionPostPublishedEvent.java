package art.yesulin.auditionpost.application;

/** 기획사가 공고를 올렸다. 커밋된 뒤 운영자에게 알려 오픈채팅방에 공유할 수 있게 한다. */
public record ProducerAuditionPostPublishedEvent(
        long postId,
        String companyName,
        String category,
        String title,
        String pay,
        String deadlineText
) {
}
