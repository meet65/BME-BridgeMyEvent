package BME.bridgemyevent.Controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
// import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import BME.bridgemyevent.Dto.ClientRegisterRequest;
import BME.bridgemyevent.Dto.LoginRequest;
import BME.bridgemyevent.Dto.LoginResponse;
import BME.bridgemyevent.Dto.OrganizerRegisterRequest;
import BME.bridgemyevent.Service.AuthService;



@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    // CLIENT REGISTER
    @PostMapping("/register/client")
    public ResponseEntity<?> registerClient(@RequestBody ClientRegisterRequest req) {
        authService.registerClient(req);
        return ResponseEntity.ok("Client registered successfully");
    }

    // ORGANIZER REGISTER
    @PostMapping("/register/organizer")
    public ResponseEntity<?> registerOrganizer(@RequestBody OrganizerRegisterRequest req) {
        authService.registerOrganizer(req);
        return ResponseEntity.ok("Organizer request submitted");
    }

    // LOGIN
    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(
            request.email,
            request.password,
            request.role
        );
    }
}

