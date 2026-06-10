package BME.bridgemyevent.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import BME.bridgemyevent.Model.Event;

@Repository
public interface EventRepository
        extends MongoRepository<Event, String> {

    List<Event> findByOrganizerId(String organizerId);
    List<Event> findByCity(String city);
    List<Event> findBySupportedEventsContaining(String eventType);
    Optional<Event> findByIdAndOrganizerId(String id, String organizerId);

}
