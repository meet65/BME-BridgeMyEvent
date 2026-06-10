package BME.bridgemyevent.Model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Document("client_profiles")
@Data
public class ClientProfile {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;   // link to User

    private String fullName;
    @Indexed(unique = true, sparse = true)
    private String userName;


    @Indexed(unique = true)
    private String email;

    private String phone;
    private String city;
    private String state;
    private String about;

    private String profileImage; // URL or base64

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ClientProfile() {
        this.createdAt = LocalDateTime.now();
    }
}



