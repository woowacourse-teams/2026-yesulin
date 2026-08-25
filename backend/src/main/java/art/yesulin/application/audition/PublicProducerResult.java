package art.yesulin.application.audition;

import art.yesulin.domain.producer.Producer;

/**
 * 공개 공고에 노출하는 기획사·제작사 정보다. 내부 담당자·연락처·인증 상태는 포함하지 않는다.
 */
public record PublicProducerResult(String companyName, String description) {

    public static PublicProducerResult from(Producer producer) {
        return new PublicProducerResult(producer.getCompanyName(), producer.getDescription());
    }
}
