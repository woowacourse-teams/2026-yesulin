package art.yesulin.domain.applicant;

import java.net.URI;
import java.util.Objects;

public record ProfilePhoto(URI url) { // no-excuse-ok: domain value object

    public ProfilePhoto {
        Objects.requireNonNull(url);
    }
}
