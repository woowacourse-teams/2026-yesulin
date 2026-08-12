package art.yesulin.domain.applicant;

import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;
import java.util.List;

public final class ApplicantProfile {

    private static final int MAX_PHOTO_COUNT = 10;

    private final String activityName;
    private final List<ProfilePhoto> photos;

    private ApplicantProfile(String activityName, List<ProfilePhoto> photos) {
        this.activityName = activityName;
        this.photos = photos;
    }

    public static ApplicantProfile create(String activityName, List<ProfilePhoto> photos) {
        List<ProfilePhoto> copiedPhotos = List.copyOf(photos);
        if (copiedPhotos.size() > MAX_PHOTO_COUNT) {
            throw new DomainException(DomainError.TOO_MANY_PROFILE_PHOTOS);
        }
        return new ApplicantProfile(activityName, copiedPhotos);
    }

    public String activityName() {
        return activityName;
    }

    public List<ProfilePhoto> photos() {
        return photos;
    }
}
