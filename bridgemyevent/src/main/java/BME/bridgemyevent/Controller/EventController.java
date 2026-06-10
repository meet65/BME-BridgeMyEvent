package BME.bridgemyevent.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import BME.bridgemyevent.Model.Event;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Repository.EventRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;


@RestController
@RequestMapping("/events")
public class EventController {

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private OrganizerProfileRepository organizerRepo;

    @PostMapping
    public Event create(@RequestBody Event event) {
        return eventRepository.save(event); // ID generated here
    }

    @GetMapping
    public List<Event> all() {
        return eventRepository.findAll();
    }
    
    
    public void createEvent(String email, Event event) {
    
        OrganizerProfile organizer = organizerRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));
    
        // link organizer
        event.setOrganizerId(organizer.getId());
    
        eventRepository.save(event); 
    
    }
}
