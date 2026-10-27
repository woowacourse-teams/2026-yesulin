package art.yesulin.actor.domain.page;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ActorPagePublishConsentRepository extends JpaRepository<ActorPagePublishConsent, Long> {

    long countByActorPageId(long actorPageId);
}
