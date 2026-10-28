package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPagePublicContent;
import art.yesulin.actor.domain.profile.ProfileCareer;
import art.yesulin.actor.domain.profile.ProfileCareerGenre;
import art.yesulin.actor.domain.profile.ProfileEducationLevel;
import art.yesulin.actor.domain.profile.ProfileGender;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * 누구나 보는 배우 페이지(머리 영역과 프로필 탭). 어떤 항목을 담을지는 {@link ActorPagePublicContent}가 정하고, 여기서는
 * 화면에 보일 모양으로만 바꾼다. 연락처·생년월일·거주지·병역과 '공연사만' 영상은 담지 않는다.
 *
 * @param age 한국 날짜 기준 만 나이
 * @param representativePhotoUrl 페이지 대표 사진. 사본이 준비된 공개 사진 중 맨 앞이다.
 */
public record PublicActorPageResult(
        UUID publicId,
        String handle,
        String name,
        ProfileGender gender,
        Integer birthYear,
        Integer age,
        Integer height,
        Integer weight,
        String representativePhotoUrl,
        List<Photo> photos,
        List<Video> videos,
        List<CareerGroup> careerGroups,
        String coverLetter,
        String specialty,
        String hobbies,
        String nationality,
        Education education,
        List<Link> links
) {

    public PublicActorPageResult {
        photos = List.copyOf(photos);
        videos = List.copyOf(videos);
        careerGroups = List.copyOf(careerGroups);
        links = List.copyOf(links);
    }

    static PublicActorPageResult of(
            ActorPage page, ActorPagePublicContent content, Integer age, List<String> photoUrls, List<Video> videos
    ) {
        return new PublicActorPageResult(
                page.getId() == null ? null : page.getPublicId(), page.getHandle(), content.name(), content.gender(),
                content.birthYear(), age, content.height(), content.weight(),
                photoUrls.isEmpty() ? null : photoUrls.getFirst(),
                photoUrls.stream().map(Photo::new).toList(), videos, CareerGroup.groupsOf(content.careers()),
                content.coverLetter(), content.specialty(), content.hobbies(), content.nationality(),
                Education.of(content.educationLevel(), content.school(), content.major()),
                content.links().stream().map(Link::new).toList()
        );
    }

    static Integer ageOn(LocalDate birthDate, LocalDate today) {
        return birthDate == null ? null : Period.between(birthDate, today).getYears();
    }

    /** 공개 사진 사본 주소. */
    public record Photo(String url) {
    }

    /** 전체 공개로 설정한 영상. */
    public record Video(String url, String youtubeId) {
    }

    /**
     * 같은 장르의 경력 묶음.
     *
     * @param genre 장르를 고르지 않은 경력(미분류)은 null이다.
     */
    public record CareerGroup(ProfileCareerGenre genre, List<Career> careers) {

        public CareerGroup {
            careers = List.copyOf(careers);
        }

        /** 장르 순서대로 묶고 미분류를 맨 뒤에 둔다. 묶음 안에서는 연도가 최근인 순이고, 같은 연도는 프로필 순서를 지킨다. */
        static List<CareerGroup> groupsOf(List<ProfileCareer> careers) {
            List<ProfileCareer> recentFirst = careers.stream()
                    .sorted(Comparator.comparingInt(ProfileCareer::year).reversed())
                    .toList();
            List<CareerGroup> groups = new ArrayList<>();
            for (ProfileCareerGenre genre : ProfileCareerGenre.values()) {
                addGroup(groups, genre, recentFirst);
            }
            addGroup(groups, null, recentFirst);
            return groups;
        }

        private static void addGroup(List<CareerGroup> groups, ProfileCareerGenre genre, List<ProfileCareer> careers) {
            List<Career> matched = careers.stream()
                    .filter(career -> career.genre() == genre)
                    .map(career -> new Career(career.year(), career.title(), career.roleName()))
                    .toList();
            if (!matched.isEmpty()) {
                groups.add(new CareerGroup(genre, matched));
            }
        }
    }

    /** 경력 한 건. */
    public record Career(int year, String title, String roleName) {
    }

    /** 학력. 공개로 설정했어도 입력한 값이 하나도 없으면 응답에 넣지 않는다. */
    public record Education(ProfileEducationLevel level, String school, String major) {

        static Education of(ProfileEducationLevel level, String school, String major) {
            if (level == null && school == null && major == null) {
                return null;
            }
            return new Education(level, school, major);
        }
    }

    /** 외부 링크. 나중에 제목·순서를 더할 수 있게 객체로 내보낸다. */
    public record Link(String url) {
    }
}
