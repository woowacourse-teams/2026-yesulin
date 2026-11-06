package art.yesulin.feedback.presentation;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.application.annotation.LoginMember;
import art.yesulin.feedback.application.FeedbackImageFile;
import art.yesulin.feedback.application.FeedbackService;
import art.yesulin.feedback.application.FeedbackSubmission;
import art.yesulin.feedback.application.FeedbackWriter;
import art.yesulin.feedback.domain.Feedback;
import art.yesulin.feedback.domain.FeedbackPage;
import art.yesulin.feedback.domain.FeedbackType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 로그인 없이도 어느 화면에서나 의견을 보낸다. 로그인했으면 회원 번호를 함께 저장한다.
 * 사진을 첨부하면 multipart로 받고, 사진 없는 이전 화면의 JSON 요청도 계속 받는다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/public/feedback")
public class FeedbackController {

    private final FeedbackService service;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackResponse submit(@Valid @RequestBody FeedbackRequest request,
                                   @LoginMember(required = false) MemberPrincipal member,
                                   @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent,
                                   HttpServletRequest httpRequest) {
        return accept(request, List.of(), member, userAgent, httpRequest);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackResponse submitWithImages(@Valid @RequestPart("request") FeedbackRequest request,
                                             @RequestPart(value = "images", required = false)
                                             List<MultipartFile> images,
                                             @LoginMember(required = false) MemberPrincipal member,
                                             @RequestHeader(value = HttpHeaders.USER_AGENT, required = false)
                                             String userAgent,
                                             HttpServletRequest httpRequest) {
        return accept(request, imageFiles(images), member, userAgent, httpRequest);
    }

    private FeedbackResponse accept(FeedbackRequest request, List<FeedbackImageFile> images,
                                    MemberPrincipal member, String userAgent, HttpServletRequest httpRequest) {
        FeedbackSubmission submission = new FeedbackSubmission(request.type(), request.content(), request.contact(),
                new FeedbackPage(request.pagePath(), userAgent), memberId(member), writer(member), images);
        return new FeedbackResponse(service.submit(submission, httpRequest.getRemoteAddr()));
    }

    private List<FeedbackImageFile> imageFiles(List<MultipartFile> images) {
        if (images == null) {
            return List.of();
        }
        return images.stream().map(FeedbackController::imageFile).toList();
    }

    private static FeedbackImageFile imageFile(MultipartFile image) {
        try {
            return new FeedbackImageFile(image.getContentType(), image.getBytes());
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private Long memberId(MemberPrincipal member) {
        if (member == null) {
            return null;
        }
        return member.memberId();
    }

    private FeedbackWriter writer(MemberPrincipal member) {
        if (member == null) {
            return FeedbackWriter.GUEST;
        }
        return FeedbackWriter.from(member.role());
    }

    public record FeedbackRequest(@NotNull FeedbackType type,
                                  @NotBlank @Size(max = Feedback.CONTENT_MAX) String content,
                                  @Size(max = Feedback.CONTACT_MAX) String contact,
                                  String pagePath) {
    }

    public record FeedbackResponse(long id) {
    }
}
