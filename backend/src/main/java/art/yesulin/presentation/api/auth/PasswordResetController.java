package art.yesulin.presentation.api.auth;

import art.yesulin.application.auth.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/password-resets")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping
    public ResponseEntity<Void> sendResetMail(@Valid @RequestBody PasswordResetMailRequest request) {
        passwordResetService.sendResetMail(request.email());
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Void> validateToken(@RequestParam String token) {
        passwordResetService.validateToken(token);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody PasswordResetChangeRequest request) {
        passwordResetService.resetPassword(request.token(), request.password(), request.passwordConfirm());
        return ResponseEntity.noContent().build();
    }
}
