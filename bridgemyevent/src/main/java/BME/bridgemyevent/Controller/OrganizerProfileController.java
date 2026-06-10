package BME.bridgemyevent.Controller;

import java.io.File;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.fasterxml.jackson.databind.ObjectMapper;

import BME.bridgemyevent.Dto.BookingPricingRequest;
import BME.bridgemyevent.Dto.ChangePasswordRequest;
import BME.bridgemyevent.Dto.OrganizerProfileResponce;
import BME.bridgemyevent.Dto.UpdateOrgProfResponce;
import BME.bridgemyevent.Model.Booking;
import BME.bridgemyevent.Model.ClientProfile;
import BME.bridgemyevent.Model.Event;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.Review;
import BME.bridgemyevent.Repository.ClientProfileRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;
import BME.bridgemyevent.Service.OrganizerProfileService;


@RestController
@RequestMapping("/organizer/profile")
public class OrganizerProfileController {
    
    @Autowired
    private OrganizerProfileService profileService;

    @Autowired
    private OrganizerProfileRepository organizerRepo;
    
    @Autowired
    private ClientProfileRepository clientRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Pattern SETUP_IMAGE_FIELD_PATTERN = Pattern.compile("^setup_(\\d+)_image_\\d+$");

    // GET PROFILE
    @GetMapping
    public OrganizerProfileResponce getProfile(Authentication auth) {
        return profileService.getProfile(auth.getName());
    }

    // UPDATE PROFILE
    @PutMapping
    public ResponseEntity<?> updateProfile(
            Authentication auth,
            @RequestBody UpdateOrgProfResponce req) {

        profileService.updateProfile(auth.getName(), req);
        return ResponseEntity.ok("Profile updated successfully");
    }
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {
        try {
            String email = SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getName();

            profileService.changePassword(email, req);
            return ResponseEntity.ok("Password changed successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @PostMapping("/upload-profile-pic")
    public ResponseEntity<?> uploadProfilePic(
            Authentication auth,
            @RequestParam("file") MultipartFile file) {
        try {
            String email = auth.getName();
            OrganizerProfile profile = organizerRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Profile not found"));
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "No file selected"));
            }
            // Create upload folder
            String uploadDir = Paths.get("uploads").toAbsolutePath().toString();
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();
            //  Unique filename
            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String safeFilename = originalFilename.replaceAll("[^A-Za-z0-9._-]", "_");
            String fileName = System.currentTimeMillis() + "_" + safeFilename;
            java.nio.file.Path path = Paths.get(uploadDir, fileName);
            Files.write(path, file.getBytes());
            // Save URL
            String imageUrl = "/uploads/" + URLEncoder.encode(fileName, StandardCharsets.UTF_8);
            profile.setProfileImage(imageUrl);
            organizerRepo.save(profile);
            return ResponseEntity.ok(Map.of(
                    "message", "Upload successful",
                    "imageUrl", imageUrl
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }
    @PostMapping("/create-event")
    public ResponseEntity<?> createEvent(
            @RequestBody Event event,
            Authentication auth
    ) {
        profileService.createEvent(auth.getName(), event);
        return ResponseEntity.ok(event);
    }

    @PostMapping(value = "/create-event", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createEventMultipart(
            Authentication auth,
            @RequestPart("eventData") String eventData,
            MultipartHttpServletRequest request
    ) {
        try {
            Event event = objectMapper.readValue(eventData, Event.class);
            attachUploadedImages(event, request);
            profileService.createEvent(auth.getName(), event);
            return ResponseEntity.ok(event);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/my-events")
    public ResponseEntity<?> getMyEvents(Authentication auth) {
        return ResponseEntity.ok(profileService.getMyEvents(auth.getName()));
    }
    @PostMapping("/event-details")
    public ResponseEntity<Event> getViewEvent(
            Authentication auth,
            @RequestBody Map<String, String> request
    ) {
        String eventId = request.get("eventId");
        return ResponseEntity.ok(
                profileService.getViewEvent(auth.getName(), eventId));
    }

    @GetMapping("/events/{eventId}")
    public ResponseEntity<Event> getEventById(Authentication auth, @PathVariable String eventId) {
        return ResponseEntity.ok(profileService.getViewEvent(auth.getName(), eventId));
    }

    @PutMapping("/events/{eventId}")
    public ResponseEntity<Event> updateEvent(
            Authentication auth,
            @PathVariable String eventId,
            @RequestBody Event event
    ) {
        return ResponseEntity.ok(
                profileService.updateEvent(auth.getName(), eventId, event));
    }

    @PutMapping(value = "/events/{eventId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateEventMultipart(
            Authentication auth,
            @PathVariable String eventId,
            @RequestPart("eventData") String eventData,
            MultipartHttpServletRequest request
    ) {
        try {
            Event event = objectMapper.readValue(eventData, Event.class);
            attachUploadedImages(event, request);
            Event updated = profileService.updateEvent(auth.getName(), eventId, event);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/events/{eventId}")
    public ResponseEntity<?> deleteEvent(
            Authentication auth,
            @PathVariable String eventId
    ) {
        profileService.deleteEvent(auth.getName(), eventId);
        return ResponseEntity.ok("Event deleted successfully");
    }

    @GetMapping("/bookings")
    public List<Booking> getOrganizerBookings(Authentication auth) {
        return profileService.getOrganizerBookings(auth.getName());
    }

    @PutMapping("/bookings/{bookingId}/status")
    public Booking updateStatus(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestParam String status) {
        return profileService.updateStatus(auth.getName(), bookingId, status);
    }

    @PutMapping("/bookings/{bookingId}/pricing")
    public Booking updateBookingPricing(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestBody BookingPricingRequest req) {
        return profileService.updateBookingPricing(
                auth.getName(),
                bookingId,
                req.getBaseAmount(),
                req.getSetupAmount(),
                req.getTotalAmount()
        );
    }

    @PutMapping("/bookings/{bookingId}/admin-payment")
    public Booking payAdminPayment(
            Authentication auth,
            @PathVariable String bookingId) {
        return profileService.payAdminFee(auth.getName(), bookingId);
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<?> getClientProfile(@PathVariable String clientId) {
        ClientProfile profile = clientRepo.findByUserId(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));
        return ResponseEntity.ok(Map.of(
                "fullName", profile.getFullName(),
                "email", profile.getEmail(),
                "phone", profile.getPhone(),
                "city", profile.getCity(),
                "state", profile.getState(),
                "about", profile.getAbout(),
                "profileImage", profile.getProfileImage()
        ));
    }

    @GetMapping("/reviews")
    public List<Review> getOrganizerReviews(Authentication auth) {
        return profileService.getOrganizerReviews(auth.getName());
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getOrganizerAnalytics(Authentication auth) {
        return ResponseEntity.ok(profileService.getOrganizerAnalytics(auth.getName()));
    }

    @GetMapping("/earnings")
    public ResponseEntity<?> getOrganizerEarnings(Authentication auth) {
        return ResponseEntity.ok(profileService.getOrganizerEarnings(auth.getName()));
    }

    private void attachUploadedImages(Event event, MultipartHttpServletRequest request) throws IOException {
        if (event == null) return;

        if (event.getVenueImages() == null) {
            event.setVenueImages(new ArrayList<>());
        }

        for (var entry : request.getFileMap().entrySet()) {
            String fieldName = entry.getKey();
            MultipartFile file = entry.getValue();
            if (file == null || file.isEmpty()) continue;

            if (fieldName.startsWith("venue_image_")) {
                String url = saveUploadFile(file);
                event.getVenueImages().add(url);
                continue;
            }

            Matcher matcher = SETUP_IMAGE_FIELD_PATTERN.matcher(fieldName);
            if (!matcher.matches()) continue;

            int setupIndex = Integer.parseInt(matcher.group(1));
            if (setupIndex < 0 || event.getSetups() == null || setupIndex >= event.getSetups().size()) continue;

            String url = saveUploadFile(file);
            var setup = event.getSetups().get(setupIndex);
            if (setup.getImages() == null) {
                setup.setImages(new ArrayList<>());
            }
            setup.getImages().add(url);
        }
    }

    private String saveUploadFile(MultipartFile file) throws IOException {
        String uploadDir = Paths.get("uploads").toAbsolutePath().toString();
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();

        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String safeFilename = originalFilename.replaceAll("[^A-Za-z0-9._-]", "_");
        String fileName = System.currentTimeMillis() + "_" + safeFilename;
        java.nio.file.Path path = Paths.get(uploadDir, fileName);
        Files.write(path, file.getBytes());

        return "/uploads/" + URLEncoder.encode(fileName, StandardCharsets.UTF_8);
    }

    @PostMapping("/bookings/{bookingId}/respond-change")
    public ResponseEntity<?> respondToBookingChange(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestParam String action) {
        try {
            Booking booking = profileService.respondToBookingChange(auth.getName(), bookingId, action);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings/{bookingId}/adjust-price")
    public ResponseEntity<?> adjustBookingPrice(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestParam Double adjustment) {
        try {
            Booking booking = profileService.adjustBookingPrice(auth.getName(), bookingId, adjustment);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings/{bookingId}/refund")
    public ResponseEntity<?> refundBookingDeposit(
            Authentication auth,
            @PathVariable String bookingId) {
        try {
            Booking booking = profileService.refundBookingDeposit(auth.getName(), bookingId);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
