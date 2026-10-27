package art.yesulin.file.application.storage;

import java.util.Collection;

/**
 * CDN이 캐시한 공개 객체를 만료시킨다. 지운 공개 객체가 캐시 기간 동안 계속 보이지 않게 할 때 쓴다.
 * CDN 배포가 설정되지 않은 환경에서는 아무것도 하지 않는다.
 */
public interface PublicObjectCache {

    /** 실패해도 예외를 던지지 않는다. 남은 캐시는 객체의 캐시 기간이 지나면 사라진다. */
    void evict(Collection<String> objectKeys);
}
