package BME.bridgemyevent.Model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data
@Document(collection = "reviews")
public class Review {

    @Id
    private String id;

    private String clientId;
    private String organizerId;
    private String eventId;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}