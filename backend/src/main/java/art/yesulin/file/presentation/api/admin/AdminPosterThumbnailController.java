package art.yesulin.file.presentation.api.admin;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.auth.application.annotation.LoginRequired;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.file.application.admin.PosterThumbnailBackfill;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/poster-thumbnails")
@LoginRequired
@RequiredArgsConstructor
public class AdminPosterThumbnailController {

    private final PosterThumbnailBackfill backfill;

    @PostMapping("/backfill")
    public List<PosterThumbnailBackfill.Item> backfill(
            @LoginMember(roles = MemberType.ADMIN) MemberPrincipal principal,
            @Valid @RequestBody BackfillRequest request
    ) {
        return backfill.submit(
                request.auditionPostIds(), request.showIds(), Boolean.TRUE.equals(request.retryFailed())
        );
    }

    public record BackfillRequest(
            @NotNull @Size(max = 27) List<@NotNull @Positive Long> auditionPostIds,
            @NotNull @Size(max = 27) List<@NotNull UUID> showIds,
            Boolean retryFailed
    ) {

        @AssertTrue
        public boolean isValidBatchSize() {
            if (auditionPostIds == null || showIds == null) {
                return true;
            }
            int requested = auditionPostIds.size() + showIds.size();
            return requested > 0 && requested <= 27;
        }
    }
}
