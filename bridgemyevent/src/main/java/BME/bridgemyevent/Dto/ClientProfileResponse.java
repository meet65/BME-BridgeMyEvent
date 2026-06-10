package BME.bridgemyevent.Dto;

import lombok.Data;

@Data
public class ClientProfileResponse {
    private String fullName;
    private String userName;
    private String email;
    private String phone;
    private String city;
    private String state;
    private String about;
    private String profileImage;
    private String status;
}
