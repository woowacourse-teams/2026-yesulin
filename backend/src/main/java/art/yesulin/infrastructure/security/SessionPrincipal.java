package art.yesulin.infrastructure.security;

import java.io.Serial;
import java.io.Serializable;

public record SessionPrincipal(long accountId, String email) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
