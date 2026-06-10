package BME.bridgemyevent.Repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import BME.bridgemyevent.Model.Review;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByClientId(String clientId);
    List<Review> findByOrganizerId(String organizerId);
    List<Review> findByEventId(String eventId);
}
