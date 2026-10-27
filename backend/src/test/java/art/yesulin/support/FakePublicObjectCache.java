package art.yesulin.support;

import art.yesulin.file.application.storage.PublicObjectCache;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class FakePublicObjectCache implements PublicObjectCache {

    private final List<String> evicted = new CopyOnWriteArrayList<>();

    @Override
    public void evict(Collection<String> objectKeys) {
        evicted.addAll(objectKeys);
    }

    public List<String> evicted() {
        return List.copyOf(evicted);
    }
}
