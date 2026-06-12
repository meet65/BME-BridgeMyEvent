package BME.bridgemyevent.Controller;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import BME.bridgemyevent.Dto.ChangePasswordRequest;
import BME.bridgemyevent.Dto.ClientProfileResponse;
import BME.bridgemyevent.Dto.UpdateClientProfileRequest;
import BME.bridgemyevent.Model.Booking;
import BME.bridgemyevent.Model.ClientProfile;
import BME.bridgemyevent.Model.Event;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.Review;
import BME.bridgemyevent.Repository.ClientProfileRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;
import BME.bridgemyevent.Service.ClientProfileService;

@RestController
@RequestMapping("/client/profile")
public class ClientProfileController {

    @Autowired
    private ClientProfileService clientService;

    @Autowired
    private ClientProfileRepository clientRepo;

    @Autowired
    private OrganizerProfileRepository organizerRepo;

    // GET PROFILE
    @GetMapping
    public ClientProfileResponse getProfile(Authentication auth) {
        return clientService.getProfile(auth.getName());
    }

    // UPDATE PROFILE
    @PutMapping
    public ResponseEntity<?> updateProfile(
            Authentication auth,
            @RequestBody UpdateClientProfileRequest req) {

        clientService.updateProfile(auth.getName(), req);
        return ResponseEntity.ok("Profile updated successfully");
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest req) {
        try {
            String email = SecurityContextHolder
                    .getContext()
                    .getAuthentication()
                    .getName();
            String msg = clientService.changePassword(email, req);

            return ResponseEntity.ok(Map.of("message", msg));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/upload-profile-pic")
    public ResponseEntity<?> uploadProfilePic(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        try {
            String email = authentication.getName();

            ClientProfile profile = clientRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Profile not found"));

            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "No file selected"));
            }

            // Create upload folder
            String uploadDir = Paths.get("uploads").toAbsolutePath().toString();
            File dir = new File(uploadDir);
            if (!dir.exists())
                dir.mkdirs();

            String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String safeFilename = originalFilename.replaceAll("[^A-Za-z0-9._-]", "_");
            String fileName = System.currentTimeMillis() + "_" + safeFilename;
            java.nio.file.Path path = Paths.get(uploadDir, fileName);

            Files.write(path, file.getBytes());

            String imageUrl = "/uploads/" + URLEncoder.encode(fileName, StandardCharsets.UTF_8);
            profile.setProfileImage(imageUrl);
            clientRepo.save(profile);

            return ResponseEntity.ok(Map.of(
                    "message", "Upload successful",
                    "imageUrl", imageUrl));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/explore-organizers")
    public ResponseEntity<?> getAllEvent() {
        try {
            return ResponseEntity.ok(clientService.getAllEvent());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/event-details")
    public ResponseEntity<Event> getViewEvent(
            @RequestBody Map<String, String> request) {
        String eventId = request.get("eventId");
        return ResponseEntity.ok(
                clientService.getViewEvent(eventId));
    }

    @GetMapping("/organizer/{organizerId}")
    public ResponseEntity<?> getOrganizerProfile(@PathVariable String organizerId) {
        OrganizerProfile profile = organizerRepo.findByUserId(organizerId)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));

        Map<String, Object> summary = clientService.getOrganizerReviewSummary(organizerId);
        Map<String, Object> response = new HashMap<>();
        response.put("companyName", profile.getCompanyName());
        response.put("fullName", profile.getFullName());
        response.put("email", profile.getEmail());
        response.put("contactNumber", profile.getContactNumber());
        response.put("city", profile.getCity());
        response.put("state", profile.getState());
        response.put("about", profile.getAbout());
        response.put("description", profile.getDescription());
        response.put("profileImage", profile.getProfileImage());
        response.put("rating", summary.get("rating"));
        response.put("reviewCount", summary.get("reviewCount"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/reviews")
    public List<Map<String, Object>> getMyReviews(Authentication auth) {
        return clientService.getClientReviews(auth.getName());
    }

    @GetMapping("/event/{eventId}/reviews")
    public List<Map<String, Object>> getEventReviews(@PathVariable String eventId) {
        return clientService.getEventReviews(eventId);
    }

    @GetMapping("/event/{eventId}/reviews/summary")
    public Map<String, Object> getEventReviewSummary(@PathVariable String eventId) {
        return clientService.getEventReviewSummary(eventId);
    }

    @GetMapping("/organizer/{organizerId}/reviews")
    public List<Map<String, Object>> getOrganizerReviews(@PathVariable String organizerId) {
        return clientService.getOrganizerReviews(organizerId);
    }

    @GetMapping("/organizer/{organizerId}/reviews/summary")
    public Map<String, Object> getOrganizerReviewSummary(@PathVariable String organizerId) {
        return clientService.getOrganizerReviewSummary(organizerId);
    }

    @PostMapping("/reviews")
    public Review submitReview(@RequestBody Review review, Authentication auth) {
        return clientService.addReview(auth.getName(), review);
    }

    // client send booking request
    @PostMapping("/create")
    public Booking createBooking(@RequestBody Booking booking, Authentication auth) {
        return clientService.createBooking(auth.getName(), booking);
    }

    // client see bookings
    @GetMapping("/bookings")
    public List<Booking> getClientBookings(Authentication auth) {
        return clientService.getClientBookings(auth.getName());
    }

    // client cancel booking
    @PutMapping("/bookings/{bookingId}/status")
    public Booking updateBookingStatus(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestParam String status) {
        return clientService.updateBookingStatus(auth.getName(), bookingId, status);
    }

    @PostMapping("/bookings/{bookingId}/payment/fake")
    public ResponseEntity<?> fakePayment(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestParam String stage) {
        try {
            Booking booking = clientService.applyFakePayment(auth.getName(), bookingId, stage);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bookings/{bookingId}/request-change")
    public ResponseEntity<?> requestBookingChange(
            Authentication auth,
            @PathVariable String bookingId,
            @RequestBody BME.bridgemyevent.Dto.RequestedChangesDTO changes) {
        try {
            Booking booking = clientService.requestBookingChange(auth.getName(), bookingId, changes);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
