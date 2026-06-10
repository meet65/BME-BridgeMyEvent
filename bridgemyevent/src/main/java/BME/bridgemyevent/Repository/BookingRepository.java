package BME.bridgemyevent.Repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import BME.bridgemyevent.Model.Booking;
import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, String> {

    List<Booking> findByClientId(String clientId);
    List<Booking> findByOrganizerId(String organizerId);
    List<Booking> findByEventId(String eventId);
}
