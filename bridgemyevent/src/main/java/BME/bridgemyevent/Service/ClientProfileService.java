package BME.bridgemyevent.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import BME.bridgemyevent.Dto.ChangePasswordRequest;
import BME.bridgemyevent.Dto.ClientProfileResponse;
import BME.bridgemyevent.Dto.UpdateClientProfileRequest;
import BME.bridgemyevent.Model.Booking;
import BME.bridgemyevent.Model.BookingDateTime;
import BME.bridgemyevent.Model.ClientProfile;
import BME.bridgemyevent.Model.Event;
import BME.bridgemyevent.Model.EventAvailability;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.Review;
import BME.bridgemyevent.Model.SetupVariant;
import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Repository.BookingRepository;
import BME.bridgemyevent.Repository.ClientProfileRepository;
import BME.bridgemyevent.Repository.EventRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;
import BME.bridgemyevent.Repository.ReviewRepository;
import BME.bridgemyevent.Repository.UserRepository;

@Service
public class ClientProfileService {

    @Autowired
    private ClientProfileRepository clientRepo;

    @Autowired
    private UserRepository userRepo;
 
    @Autowired
    private EventRepository eventRepo;
    
    @Autowired
    private OrganizerProfileRepository organizerRepo;

    @Autowired
    private ReviewRepository reviewRepo;



    // GET PROFILE
    public ClientProfileResponse getProfile(String email) {

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ClientProfile profile = clientRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        ClientProfileResponse res = new ClientProfileResponse();
        res.setFullName(profile.getFullName());
        res.setUserName(profile.getUserName());
        res.setEmail(profile.getEmail());
        res.setPhone(profile.getPhone());
        res.setCity(profile.getCity());
        res.setState(profile.getState());
        res.setAbout(profile.getAbout());
        res.setProfileImage(profile.getProfileImage());
        res.setStatus(user.getStatus());

        return res;
    }

    // UPDATE PROFILE
    public void updateProfile(String email, UpdateClientProfileRequest req) {

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ClientProfile profile = clientRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setFullName(req.getFullName());
        profile.setPhone(req.getPhone());
        profile.setCity(req.getCity());
        profile.setState(req.getState());
        profile.setAbout(req.getAbout());
        profile.setProfileImage(req.getProfileImage());
        profile.setUpdatedAt(LocalDateTime.now());

        clientRepo.save(profile);
    }


        @Autowired
        private PasswordEncoder encoder;

        @Autowired
        private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

        public String changePassword(String email, ChangePasswordRequest req) {

                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                //  VALIDATION 
                if (req.getCurrentPassword() == null ||
                        req.getNewPassword() == null ||
                        req.getConfirmPassword() == null) {
                        throw new RuntimeException("All password fields are required");
                }

                if (!encoder.matches(req.getCurrentPassword(), user.getPassword())) {
                        throw new RuntimeException("Current password is incorrect");
                }

                if (!req.getNewPassword().equals(req.getConfirmPassword())) {
                        throw new RuntimeException("Passwords do not match");
                }

                if (req.getNewPassword().length() < 6) {
                        throw new RuntimeException("Password must be at least 6 characters");
                }

                //  UPDATE PASSWORD 
                user.setPassword(encoder.encode(req.getNewPassword()));
                userRepository.save(user);

                return "Password updated successfully";
        }

        public List<Event> getAllEvent() {
                return eventRepo.findAll().stream()
                        .filter(e -> {
                                String status = e.getAdminStatus() == null ? "PUBLISHED" : e.getAdminStatus().toUpperCase();
                                return "PUBLISHED".equals(status) || "FLAGGED".equals(status);
                        })
                        .toList();
        }        
        
        public Event getViewEvent(String eventId) {
                return eventRepo.findById(eventId)
                        .orElseThrow(() -> new RuntimeException("Event not found"));
        }

        public Review addReview(String email, Review review) {
                if (review == null) {
                        throw new RuntimeException("Review cannot be empty");
                }
                if (review.getRating() < 1 || review.getRating() > 5) {
                        throw new RuntimeException("Rating must be between 1 and 5");
                }
                if (review.getComment() == null || review.getComment().isBlank()) {
                        throw new RuntimeException("Review comment is required");
                }
                if (review.getEventId() == null || review.getEventId().isBlank()) {
                        throw new RuntimeException("Event ID is required for reviews");
                }

                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Event event = eventRepo.findById(review.getEventId())
                        .orElseThrow(() -> new RuntimeException("Event not found"));

                review.setClientId(user.getId());
                review.setOrganizerId(event.getOrganizerId());
                review.setEventId(event.getId());
                review.setCreatedAt(LocalDateTime.now());

                return reviewRepo.save(review);
        }

        public List<Map<String, Object>> getClientReviews(String email) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                return mapReviews(reviewRepo.findByClientId(user.getId()));
        }

        public List<Map<String, Object>> getEventReviews(String eventId) {
                return mapReviews(reviewRepo.findByEventId(eventId));
        }

        public List<Map<String, Object>> getOrganizerReviews(String organizerId) {
                return mapReviews(reviewRepo.findByOrganizerId(organizerId));
        }

        public Map<String, Object> getOrganizerReviewSummary(String organizerId) {
                List<Review> reviews = reviewRepo.findByOrganizerId(organizerId);
                Map<String, Object> summary = new HashMap<>();
                summary.put("rating", calculateAverageRating(reviews));
                summary.put("reviewCount", reviews.size());
                return summary;
        }

        public Map<String, Object> getEventReviewSummary(String eventId) {
                List<Review> reviews = reviewRepo.findByEventId(eventId);
                Map<String, Object> summary = new HashMap<>();
                summary.put("rating", calculateAverageRating(reviews));
                summary.put("reviewCount", reviews.size());
                return summary;
        }

        private double calculateAverageRating(List<Review> reviews) {
                if (reviews == null || reviews.isEmpty()) {
                        return 0d;
                }
                return reviews.stream()
                        .mapToInt(Review::getRating)
                        .average()
                        .orElse(0d);
        }

        private List<Map<String, Object>> mapReviews(List<Review> reviews) {
                return reviews.stream().map(review -> {
                        Map<String, Object> data = new HashMap<>();
                        data.put("id", review.getId());
                        data.put("eventId", review.getEventId());
                        data.put("organizerId", review.getOrganizerId());
                        data.put("rating", review.getRating());
                        data.put("comment", review.getComment());
                        data.put("createdAt", review.getCreatedAt());
                        data.put("eventName", resolveEventName(review.getEventId()));
                        return data;
                }).toList();
        }

        private String resolveEventName(String eventId) {
                if (eventId == null) return null;
                return eventRepo.findById(eventId)
                        .map(Event::getVenueName)
                        .orElse("Unknown event");
        }

        // create booking request
        public Booking createBooking(String email, Booking booking) {
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (booking.getEventId() == null || booking.getEventId().isBlank()) {
                throw new RuntimeException("Event ID is required");
            }

            Event event = eventRepo.findById(booking.getEventId())
                    .orElseThrow(() -> new RuntimeException("Event not found"));

            ClientProfile profile = clientRepo.findByUserId(user.getId())
                    .orElseThrow(() -> new RuntimeException("Profile not found"));

            validateBooking(event, booking);

            booking.setEventId(event.getId());
            booking.setClientId(user.getId());
            booking.setOrganizerId(event.getOrganizerId());
            booking.setClientName(profile.getFullName());
            booking.setClientEmail(profile.getEmail());
            booking.setClientPhone(profile.getPhone());
            booking.setClientProfileImage(profile.getProfileImage());
            booking.setVenueName(event.getVenueName());
            booking.setCompanyName(event.getCompanyName());
            booking.setCity(event.getCity());
            OrganizerProfile organizerProfile = organizerRepo.findByUserId(event.getOrganizerId()).orElse(null);
            if (organizerProfile != null) {
                    booking.setOrganizerProfileImage(organizerProfile.getProfileImage());
            }
            booking.setStatus("REQUESTED");
            applyPricingDefaults(event, booking);
            initPaymentFields(booking);

            return bookingRepository.save(booking);
        }
    
        // get bookings for client
        public List<Booking> getClientBookings(String email) {
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            List<Booking> bookings = bookingRepository.findByClientId(user.getId());
            bookings.forEach(this::populateMissingOrganizerImage);
            return bookings;
        }

        private void populateMissingOrganizerImage(Booking booking) {
            if (booking == null || booking.getOrganizerId() == null || booking.getOrganizerId().isBlank()) {
                return;
            }
            if (booking.getOrganizerProfileImage() != null && !booking.getOrganizerProfileImage().trim().isEmpty()) {
                return;
            }
            OrganizerProfile organizerProfile = organizerRepo.findByUserId(booking.getOrganizerId()).orElse(null);
            if (organizerProfile != null && organizerProfile.getProfileImage() != null && !organizerProfile.getProfileImage().trim().isEmpty()) {
                booking.setOrganizerProfileImage(organizerProfile.getProfileImage());
            }
        }

        // update booking status (client cancel)
        public Booking updateBookingStatus(String email, String bookingId, String status) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (!user.getId().equals(booking.getClientId())) {
                        throw new RuntimeException("Unauthorized");
                }

                String normalized = status == null ? "" : status.trim().toUpperCase();
                if (!"CANCELLED".equals(normalized)) {
                        throw new RuntimeException("Invalid status");
                }

                String current = booking.getStatus() == null ? "" : booking.getStatus().trim().toUpperCase();
                if ("COMPLETED".equals(current)) {
                        throw new RuntimeException("Completed bookings cannot be cancelled");
                }

                booking.setStatus(normalized);
                return bookingRepository.save(booking);
        }

        public Booking requestBookingChange(String email, String bookingId, BME.bridgemyevent.Dto.RequestedChangesDTO changes) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (!user.getId().equals(booking.getClientId())) {
                        throw new RuntimeException("Unauthorized");
                }

                try {
                        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(changes);
                        booking.setRequestedDetailsJson(json);
                        booking.setChangeRequestStatus("PENDING");
                        return bookingRepository.save(booking);
                } catch (Exception e) {
                        throw new RuntimeException("Failed to process change request");
                }
        }

        public Booking applyFakePayment(String email, String bookingId, String stage) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (!user.getId().equals(booking.getClientId())) {
                        throw new RuntimeException("Unauthorized");
                }

                String normalizedStage = normalizeStage(stage);
                ensurePaymentAmounts(booking);

                if (booking.getTotalAmountValue() == null) {
                        throw new RuntimeException("Payment amount not available");
                }

                String status = normalizeStatus(booking.getStatus());
                String paymentStatus = normalizePaymentStatus(booking.getPaymentStatus());
                if ("DEPOSIT".equals(normalizedStage)) {
                        if (!"PENDING_PAYMENT".equals(status)) {
                                throw new RuntimeException("Deposit payment is not available for this booking");
                        }
                        if (!"PENDING_DEPOSIT".equals(paymentStatus)) {
                                throw new RuntimeException("Deposit payment is not pending for this booking");
                        }
                        booking.setPaymentStatus("DEPOSIT_PAID");
                        booking.setPaidAmount(safeAmount(booking.getDepositAmount()));
                        booking.setStatus("CONFIRMED");
                } else if ("FINAL".equals(normalizedStage)) {
                        if (!"RUNNING".equals(status) && !"COMPLETED".equals(status)) {
                                throw new RuntimeException("Final payment is available after the event starts");
                        }
                        if (!"PENDING_FINAL".equals(paymentStatus)) {
                                throw new RuntimeException("Final payment is not pending for this booking");
                        }
                        booking.setPaymentStatus("PAID");
                        booking.setPaidAmount(safeAmount(booking.getTotalAmountValue()));
                } else {
                        throw new RuntimeException("Invalid payment stage");
                }

                booking.setLastPaymentStage(normalizedStage);
                booking.setLastPaymentId("FAKE-" + System.currentTimeMillis());
                return bookingRepository.save(booking);
        }

        private void initPaymentFields(Booking booking) {
                ensurePaymentAmounts(booking);
                booking.setPaymentCurrency("INR");
                booking.setPaidAmount(0d);
                if (booking.getTotalAmountValue() == null) {
                        booking.setPaymentStatus("QUOTE_REQUIRED");
                } else {
                        booking.setPaymentStatus("NOT_DUE");
                }
        }

        private void ensurePaymentAmounts(Booking booking) {
                if (booking.getTotalAmountValue() == null) {
                        Double parsed = parseAmount(booking.getTotalAmount());
                        booking.setTotalAmountValue(parsed);
                }

                if (booking.getTotalAmountValue() == null) {
                        return;
                }

                BigDecimal total = BigDecimal.valueOf(booking.getTotalAmountValue())
                        .setScale(2, RoundingMode.HALF_UP);
                BigDecimal deposit = total.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                
                double adjustment = booking.getPriceAdjustment() != null ? booking.getPriceAdjustment() : 0.0;
                BigDecimal finalAmt = total.subtract(deposit).add(BigDecimal.valueOf(adjustment));

                booking.setDepositAmount(deposit.doubleValue());
                booking.setFinalAmount(finalAmt.doubleValue());
        }

        private void applyPricingDefaults(Event event, Booking booking) {
                BookingQuantities quantities = getBookingQuantities(booking);

                boolean baseOnRequest = "price on request".equalsIgnoreCase(event.getPriceType());
                booking.setBasePriceOnRequest(baseOnRequest);
                Double baseAmount = null;

                if (!baseOnRequest && event.getPriceAmount() > 0) {
                        baseAmount = calcByUnit(event.getPriceAmount(), normalizeUnit(event.getPriceUnit()), quantities);
                }

                SetupVariant selectedSetup = null;
                if (booking.getSetup() != null && event.getSetups() != null) {
                        for (SetupVariant setup : event.getSetups()) {
                                if (booking.getSetup().equalsIgnoreCase(setup.getSetupName())) {
                                        selectedSetup = setup;
                                        break;
                                }
                        }
                }

                boolean setupOnRequest = false;
                Double setupAmount = null;
                if (selectedSetup != null) {
                        String cond = normalizeText(selectedSetup.getPriceConditions());
                        if ("additional".equals(cond)) {
                                if (selectedSetup.getSetupPrice() != null && selectedSetup.getSetupPrice() > 0) {
                                        setupAmount = calcByUnit(selectedSetup.getSetupPrice(), normalizeUnit(selectedSetup.getPricePer()), quantities);
                                } else {
                                        setupOnRequest = true;
                                }
                        } else if ("request".equals(cond) || "price on request".equals(cond) || "on request".equals(cond)) {
                                setupOnRequest = true;
                        } else {
                                setupAmount = 0d;
                        }
                }

                booking.setSetupPriceOnRequest(setupOnRequest);
                booking.setBaseAmountValue(baseAmount);
                booking.setSetupAmountValue(setupAmount);

                if (!baseOnRequest && !setupOnRequest && baseAmount != null) {
                        double total = baseAmount + (setupAmount == null ? 0d : setupAmount);
                        booking.setTotalAmountValue(total);
                        booking.setTotalAmount(String.valueOf(total));
                }
        }

        private String normalizeUnit(String unit) {
                return unit == null ? "" : unit.toLowerCase().replaceAll("\\s+", "-");
        }

        private String normalizeText(String text) {
                return text == null ? "" : text.toLowerCase().trim();
        }

        private double calcByUnit(double amount, String unit, BookingQuantities quantities) {
                if ("per-day".equals(unit)) return amount * quantities.days;
                if ("per-hour".equals(unit)) return amount * quantities.hours;
                return amount;
        }

        private BookingQuantities getBookingQuantities(Booking booking) {
                Set<String> uniqueDates = new HashSet<>();
                double totalMinutes = 0d;

                List<BookingDateTime> slots = booking.getDateAndTime();
                if (slots == null) return new BookingQuantities(0, 0);

                for (BookingDateTime slot : slots) {
                        if (slot.getDate() != null) uniqueDates.add(slot.getDate());
                        if (slot.getTimeFrom() != null && slot.getTimeTo() != null) {
                                totalMinutes += getMinutesDiff(slot.getTimeFrom(), slot.getTimeTo());
                        }
                }
                return new BookingQuantities(uniqueDates.size(), totalMinutes / 60d);
        }

        private double getMinutesDiff(String start, String end) {
                LocalTime s = LocalTime.parse(start);
                LocalTime e = LocalTime.parse(end);
                int startMinutes = s.getHour() * 60 + s.getMinute();
                int endMinutes = e.getHour() * 60 + e.getMinute();
                return endMinutes > startMinutes ? endMinutes - startMinutes : 0d;
        }

        private static class BookingQuantities {
                final int days;
                final double hours;

                BookingQuantities(int days, double hours) {
                        this.days = days;
                        this.hours = hours;
                }
        }

        private Double parseAmount(String raw) {
                if (raw == null) return null;
                String lower = raw.toLowerCase();
                if (lower.contains("request")) return null;
                String cleaned = raw.replaceAll("[^0-9.]", "");
                if (cleaned.isBlank()) return null;
                try {
                        Double val = Double.parseDouble(cleaned);
                        return val > 0 ? val : null;
                } catch (NumberFormatException ex) {
                        return null;
                }
        }

        private String normalizeStage(String stage) {
                return stage == null ? "" : stage.trim().toUpperCase();
        }

        private String normalizeStatus(String status) {
                return status == null ? "" : status.trim().toUpperCase();
        }

        private String normalizePaymentStatus(String status) {
                return status == null ? "" : status.trim().toUpperCase();
        }

        private double safeAmount(Double value) {
                return value == null ? 0d : value.doubleValue();
        }

        private void validateBooking(Event event, Booking booking) {

                if (booking.getGuests() < event.getMinCapacity() || booking.getGuests() > event.getMaxCapacity()) {
                        throw new RuntimeException("Guest count must be between "
                                + event.getMinCapacity() + " and " + event.getMaxCapacity());
                }

                List<BookingDateTime> bookingSlots = booking.getDateAndTime();
                List<EventAvailability> eventAvailability = event.getAvailabilityData();

                for (BookingDateTime bookingSlot : bookingSlots) {

                        boolean matched = false;

                        for (EventAvailability availableSlot : eventAvailability) {

                        if (bookingSlot.getDate().equals(availableSlot.getDate())) {

                                // check time overlap
                                if (isTimeOverlap(
                                        bookingSlot.getTimeFrom(),
                                        bookingSlot.getTimeTo(),
                                        availableSlot.getTimeFrom(),
                                        availableSlot.getTimeTo()
                                )) {
                                matched = true;
                                break;
                                }
                        }
                        }

                        // availability type validation
                        if ("available_on".equalsIgnoreCase(event.getAvailabilityDataType())) {

                        if (!matched) {
                                throw new RuntimeException("Selected date/time is not available");
                        }

                        } else if ("unavailable_on".equalsIgnoreCase(event.getAvailabilityDataType())) {

                        if (matched) {
                                throw new RuntimeException("Selected date/time is unavailable");
                        }
                        }
                }
        }
        private boolean isTimeOverlap(String start1, String end1, String start2, String end2) {

                LocalTime s1 = LocalTime.parse(start1);
                LocalTime e1 = LocalTime.parse(end1);
                LocalTime s2 = LocalTime.parse(start2);
                LocalTime e2 = LocalTime.parse(end2);

                return s1.isBefore(e2) && s2.isBefore(e1);
        }
}


