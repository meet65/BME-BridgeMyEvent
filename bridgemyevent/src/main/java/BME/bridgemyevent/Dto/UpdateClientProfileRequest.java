package BME.bridgemyevent.Dto;

import lombok.Data;

@Data
public class UpdateClientProfileRequest {
    private String fullName;
    private String phone;
    private String city;
    private String state;
    private String about;
    private String profileImage;
}

