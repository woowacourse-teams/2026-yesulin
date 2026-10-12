package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 공고에 연결된 기획사를 찾는다. 기획사 정보가 없어졌으면 이름 없이 연결된 회원 번호만 남는다.
 * 화면에 보이는 작성자도 여기서 정한다. 기획사에 연결된 공고는 그 기획사의 지금 이름을 쓰므로 기획사가 설정에서 이름을 바꾸면
 * 모든 공고에 바로 반영되고, 저장된 작성자(원문 닉네임이나 운영자가 쓴 이름)는 연결을 끊었을 때 다시 보인다.
 */
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

    /** 기획사 이름 목록에서 이 공고의 기획사 이름을 꺼낸다. 연결이 없거나 기획사 정보가 없어졌으면 null이다. */
    static String nameIn(Map<Long, String> names, AuditionPost post) {
        return post.getOwnerId() == null ? null : names.get(post.getOwnerId());
    }

    /** 화면에 보이는 작성자. 연결된 기획사 이름이 있으면 그 이름, 없으면 저장된 작성자다. */
    static String authorOf(AuditionPost post, String ownerName) {
        return ownerName != null ? ownerName : post.getContent().getAuthorName();
    }

    /** 여러 공고의 기획사 이름을 한 번에 찾는다. 키는 소유 회원 번호다. */
    Map<Long, String> namesOf(List<AuditionPost> posts) {
        return namesOfIds(posts.stream().map(AuditionPost::getOwnerId).filter(Objects::nonNull).toList());
    }

    /** 기획사 회원 번호들의 이름을 한 번에 찾는다. 기획사 정보가 없는 번호는 결과에 없다. */
    Map<Long, String> namesOfIds(Collection<Long> memberIds) {
        List<Long> ownerIds = memberIds.stream().distinct().toList();
        if (ownerIds.isEmpty()) {
            return Map.of();
        }
        return producerRepository.findAllByMemberIdIn(ownerIds).stream()
                .collect(Collectors.toMap(Producer::getMemberId, Producer::getCompanyName, (first, second) -> first));
    }
}
