package BME.bridgemyevent.Dto;

import lombok.Data;

@Data
public class ClientRegisterRequest {
    public  String fullName;
    public String userName;
    public  String email;
    public String phone;
    public  String password;
}
