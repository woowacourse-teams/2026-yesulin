package art.yesulin.auditionpost.application;

/**
 * 기획사가 올리거나 고친 공고를 운영자에게 알린다. 운영자는 새 공고 알림을 그대로 오픈채팅방에 공유한다.
 * 커밋된 뒤에 호출되며, 알림이 실패해도 공고는 이미 저장됐으므로 예외를 호출한 쪽으로 던지지 않는다.
 */
public interface ProducerAuditionPostNotifier {

    void notifyPublished(ProducerAuditionPostPublishedEvent event);

    void notifyEdited(ProducerAuditionPostEditedEvent event);
}
