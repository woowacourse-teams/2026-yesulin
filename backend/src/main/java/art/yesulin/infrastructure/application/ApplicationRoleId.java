package art.yesulin.infrastructure.application;

import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;

public final class ApplicationRoleId implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long applicationId;
    private Long roleId;

    protected ApplicationRoleId() {
    }

    public ApplicationRoleId(Long applicationId, Long roleId) {
        this.applicationId = applicationId;
        this.roleId = roleId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ApplicationRoleId that)) {
            return false;
        }
        return Objects.equals(applicationId, that.applicationId)
                && Objects.equals(roleId, that.roleId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(applicationId, roleId);
    }
}
