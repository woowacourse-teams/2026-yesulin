package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** 공고에 연결된 기획사를 찾는다. 기획사 정보가 없어졌으면 이름 없이 연결된 회원 번호만 남는다. */
@Component
@RequiredArgsConstructor
class AuditionPostOwners {

    private final ProducerRepository producerRepository;

    Optional<Producer> find(long memberId) {
        return producerRepository.findByMemberId(memberId);
    }

    String nameOf(AuditionPost post) {
        if (post.getOwnerId() == null) {
            return null;
        }
        return find(post.getOwnerId()).map(Producer::getCompanyName).orElse(null);
    }

    /** 여러 공고의 기획사 이름을 한 번에 찾는다. 키는 소유 회원 번호다. */
    Map<Long, String> namesOf(List<AuditionPost> posts) {
        List<Long> ownerIds = posts.stream().map(AuditionPost::getOwnerId).filter(Objects::nonNull).distinct().toList();
        if (ownerIds.isEmpty()) {
            return Map.of();
        }
        return producerRepository.findAllByMemberIdIn(ownerIds).stream()
                .collect(Collectors.toMap(Producer::getMemberId, Producer::getCompanyName, (first, second) -> first));
    }
}
