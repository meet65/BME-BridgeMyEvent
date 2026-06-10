package BME.bridgemyevent.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

        @GetMapping("/public")
    public String publicApi() {
        return "Public API working";
    }

    @GetMapping("/secure")
    public String secureApi() {
        return "JWT is working ";
    }
}