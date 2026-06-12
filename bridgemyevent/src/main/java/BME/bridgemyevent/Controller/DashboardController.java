package BME.bridgemyevent.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Service.DashboardInitService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardInitService dashboardInitService;

    @PostMapping("/init") 
    public ResponseEntity<?> initDashboard(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(dashboardInitService.init(user));
    }
}

