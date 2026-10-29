package art.yesulin.event.domain;

import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

/** 대표·배너 이미지와 표시 순서대로 저장하는 하단 상세 이미지의 공개 저장소 키. */
public record EventImages(
        String coverKey, String bannerDesktopKey, String bannerMobileKey, List<String> detailKeys
) {

    public static final int MAX_DETAIL_IMAGES = 10;

    public EventImages {
        detailKeys = detailKeys == null ? List.of() : detailKeys;
        if (detailKeys.size() > MAX_DETAIL_IMAGES
                || detailKeys.stream().anyMatch(key -> key == null || key.isBlank())) {
            throw new BusinessException(INVALID_INPUT, "상세 이미지는 빈 항목 없이 최대 %d장까지 등록할 수 있습니다.", MAX_DETAIL_IMAGES);
        }
        detailKeys = detailKeys.stream().map(String::strip).toList();
        if (new HashSet<>(detailKeys).size() != detailKeys.size()) {
            throw new BusinessException(INVALID_INPUT, "같은 상세 이미지를 중복 등록할 수 없습니다.");
        }
    }

    public EventImages(String coverKey, String bannerDesktopKey, String bannerMobileKey) {
        this(coverKey, bannerDesktopKey, bannerMobileKey, List.of());
    }

    public static EventImages none() {
        return new EventImages(null, null, null);
    }

    /** 같은 객체를 여러 위치에 쓸 수 있어 삭제 여부는 전체 참조를 모아서 판단한다. */
    public List<String> allKeys() {
        return Stream.concat(Stream.of(coverKey, bannerDesktopKey, bannerMobileKey), detailKeys.stream())
                .filter(Objects::nonNull).distinct().toList();
    }
}
