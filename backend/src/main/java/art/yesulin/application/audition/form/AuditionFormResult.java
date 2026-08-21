package art.yesulin.application.audition.form;

import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.AdditionalQuestion;
import art.yesulin.domain.audition.form.AuditionForm;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.audition.form.PhotoRequirement;
import art.yesulin.domain.audition.form.VideoRequirement;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

public record AuditionFormResult(
        UUID auditionId,
        List<String> basicFields,
        List<String> additionalFields,
        List<PhotoRequirementResult> photoRequirements,
        List<VideoRequirementResult> videoRequirements,
        List<AdditionalQuestionResult> additionalQuestions
) {

    public static AuditionFormResult from(UUID auditionId, AuditionForm form) {
        List<PhotoRequirement> photos = form.getPhotoRequirements();
        List<VideoRequirement> videos = form.getVideoRequirements();
        List<AdditionalQuestion> questions = form.getAdditionalQuestions();
        return new AuditionFormResult(
                auditionId,
                form.getBasicFields().stream().map(BasicInformationField::name).toList(),
                form.getAdditionalFields().stream().map(AdditionalInformationField::name).toList(),
                IntStream.range(0, photos.size()).mapToObj(index -> PhotoRequirementResult.from(
                        photos.get(index), index + 1
                )).toList(),
                IntStream.range(0, videos.size()).mapToObj(index -> VideoRequirementResult.from(
                        videos.get(index), index + 1
                )).toList(),
                IntStream.range(0, questions.size()).mapToObj(index -> AdditionalQuestionResult.from(
                        questions.get(index), index + 1
                )).toList()
        );
    }
}
