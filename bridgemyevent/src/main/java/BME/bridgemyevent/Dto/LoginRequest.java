package BME.bridgemyevent.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginRequest {
    public String email;
    public String password;
    public String role;
}
