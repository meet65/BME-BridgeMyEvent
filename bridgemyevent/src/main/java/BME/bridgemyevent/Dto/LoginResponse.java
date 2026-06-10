package BME.bridgemyevent.Dto;

public class LoginResponse {

    private final String token;
    private final String role;
    private final String message;

    public LoginResponse(String token, String role, String message) {
        this.token = token;
        this.role = role;
        this.message = message;
    }

    public String getToken() { return token; }
    public String getRole() { return role; }
    public String getMessage() { return message; }
}

