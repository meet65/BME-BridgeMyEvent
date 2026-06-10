package BME.bridgemyevent.Service;


import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import BME.bridgemyevent.Dto.ChangePasswordRequest;
import BME.bridgemyevent.Dto.OrganizerProfileResponce;
import BME.bridgemyevent.Dto.UpdateOrgProfResponce;
import BME.bridgemyevent.Model.Booking;
import BME.bridgemyevent.Model.BookingDateTime;
import BME.bridgemyevent.Model.Event;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.Review;
import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Repository.BookingRepository;
import BME.bridgemyevent.Repository.EventRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;
import BME.bridgemyevent.Repository.ReviewRepository;
import BME.bridgemyevent.Repository.UserRepository;

@Service
public class OrganizerProfileService {

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH)
    );
    
    @Autowired
    private UserRepository userRepo;

    @Autowired
    private OrganizerProfileRepository organizerRepo;

    @Autowired
    private EventRepository eventRepo;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ReviewRepository reviewRepo;



    public OrganizerProfileResponce getProfile(String email){

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        OrganizerProfileResponce res = new OrganizerProfileResponce();
        res.setFullName(profile.getFullName());
        res.setEmail(profile.getEmail());
        res.setContactNumber(profile.getContactNumber());
        res.setLocations(profile.getLocations());
        res.setGst(profile.getGst());
        res.setExperience(profile.getExperience());
        res.setCity(profile.getCity());
        res.setState(profile.getState());
        res.setAbout(profile.getAbout());
        res.setProfileImage(profile.getProfileImage());
        res.setCompanyName(profile.getCompanyName());
        res.setDescription(profile.getDescription());
        res.setInstagram(profile.getInstagram());
        res.setFacebook(profile.getFacebook());
        res.setYouTube(profile.getYouTube());
        res.setWebsite(profile.getWebsite());
        res.setRating(calculateAverageRating(profile.getUserId()));
        res.setReviewCount(getReviewCount(profile.getUserId()));
        res.setStatus(user.getStatus());

        return res;
    }

    public List<Review> getOrganizerReviews(String email) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return reviewRepo.findByOrganizerId(user.getId());
    }

    private Double calculateAverageRating(String organizerId) {
        List<Review> reviews = reviewRepo.findByOrganizerId(organizerId);
        if (reviews == null || reviews.isEmpty()) {
            return 0d;
        }
        return reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0d);
    }

    private Integer getReviewCount(String organizerId) {
        return reviewRepo.findByOrganizerId(organizerId).size();
    }

    public void updateProfile(String email, UpdateOrgProfResponce req){

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setFullName(req.getFullName());
        profile.setContactNumber(req.getContactNumber());
        profile.setCity(req.getCity());
        profile.setState(req.getState());
        profile.setAbout(req.getAbout());
        profile.setInstagram(req.getInstagram());
        profile.setFacebook(req.getFacebook());
        profile.setYouTube(req.getYouTube());
        profile.setWebsite(req.getWebsite());
        profile.setDescription(req.getDescription());
        profile.setLocations(req.getLocations());

        organizerRepo.save(profile);
    }

    // change password
    
    @Autowired
    private PasswordEncoder encoder;

    public String changePassword(String email, ChangePasswordRequest req) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        // ===== VALIDATION =====
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
        // ===== UPDATE PASSWORD =====
        user.setPassword(encoder.encode(req.getNewPassword()));
        userRepo.save(user);
        return "Password updated successfully";
    }


    public void createEvent(String email, Event event) {

        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        Event newEvent = new Event();

        newEvent.setOrganizerId(user.getId());
        newEvent.setCompanyName(profile.getCompanyName());
        newEvent.setVenueName(event.getVenueName());
        newEvent.setVenueType(event.getVenueType());
        newEvent.setLocation(event.getLocation());
        newEvent.setCity(event.getCity());
        newEvent.setContactNumber(event.getContactNumber());
        newEvent.setDescription(event.getDescription());
        newEvent.setPriceType(event.getPriceType());
        newEvent.setPriceUnit(event.getPriceUnit());
        newEvent.setMinCapacity(event.getMinCapacity());
        newEvent.setMaxCapacity(event.getMaxCapacity());
        newEvent.setPriceAmount(event.getPriceAmount());
        newEvent.setAmenities(event.getAmenities());
        newEvent.setSupportedEvents(event.getSupportedEvents());
        newEvent.setSetups(event.getSetups());
        newEvent.setVenueImages(event.getVenueImages());
        newEvent.setAvailabilityDataType(event.getAvailabilityDataType());
        newEvent.setAvailabilityData(event.getAvailabilityData());

        eventRepo.save(newEvent);
    }

    public Event updateEvent(String email, String eventId, Event event) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        Event existing = eventRepo
                .findByIdAndOrganizerId(eventId, profile.getUserId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        existing.setCompanyName(profile.getCompanyName());
        existing.setVenueName(event.getVenueName());
        existing.setVenueType(event.getVenueType());
        existing.setLocation(event.getLocation());
        existing.setCity(event.getCity());
        existing.setContactNumber(event.getContactNumber());
        existing.setDescription(event.getDescription());
        existing.setPriceType(event.getPriceType());
        existing.setPriceUnit(event.getPriceUnit());
        existing.setMinCapacity(event.getMinCapacity());
        existing.setMaxCapacity(event.getMaxCapacity());
        existing.setPriceAmount(event.getPriceAmount());
        existing.setAmenities(event.getAmenities());
        existing.setSupportedEvents(event.getSupportedEvents());
        existing.setSetups(event.getSetups());
        existing.setVenueImages(event.getVenueImages());
        existing.setAvailabilityDataType(event.getAvailabilityDataType());
        existing.setAvailabilityData(event.getAvailabilityData());

        return eventRepo.save(existing);
    }

    public void deleteEvent(String email, String eventId) {
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        Event existing = eventRepo
                .findByIdAndOrganizerId(eventId, profile.getUserId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        eventRepo.delete(existing);
    }

        public Object getMyEvents(String email) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));
        
                return eventRepo.findByOrganizerId(user.getId());
        }

        public Event getViewEvent(String email, String eventId) {

                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                OrganizerProfile profile = organizerRepo.findByUserId(user.getId())
                        .orElseThrow(() -> new RuntimeException("Profile not found"));

                return eventRepo
                        .findByIdAndOrganizerId(eventId, profile.getUserId())
                        .orElseThrow(() -> new RuntimeException("Event not found"));
        }

        // get bookings for organizer
        public List<Booking> getOrganizerBookings(String email) {
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return bookingRepository.findByOrganizerId(user.getId());
        }

        // update booking status
        public Booking updateStatus(String email, String bookingId, String status) {
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found"));

            if (!user.getId().equals(booking.getOrganizerId())) {
                throw new RuntimeException("Unauthorized");
            }

            String normalized = status == null ? "" : status.trim().toUpperCase();
            if (!normalized.equals("REQUESTED") &&
                !normalized.equals("PENDING_PAYMENT") &&
                !normalized.equals("CONFIRMED") &&
                !normalized.equals("RUNNING") &&
                !normalized.equals("COMPLETED") &&
                !normalized.equals("CANCELLED") &&
                !normalized.equals("REJECTED")) {
                throw new RuntimeException("Invalid status");
            }

            if ("PENDING_PAYMENT".equals(normalized)) {
                String paymentStatus = booking.getPaymentStatus() == null ? "" : booking.getPaymentStatus().trim().toUpperCase();
                if (paymentStatus.isBlank() || "NOT_DUE".equals(paymentStatus)) {
                    if (booking.getTotalAmountValue() == null) {
                        booking.setPaymentStatus("QUOTE_REQUIRED");
                    } else {
                        booking.setPaymentStatus("PENDING_DEPOSIT");
                    }
                }
            }

            if (("RUNNING".equals(normalized) || "COMPLETED".equals(normalized))
                    && "DEPOSIT_PAID".equals(normalizePaymentStatus(booking.getPaymentStatus()))) {
                booking.setPaymentStatus("PENDING_FINAL");
            }

            if ("COMPLETED".equals(normalized) && booking.getTotalAmountValue() != null) {
                booking.setAdminFeeAmount(
                        BigDecimal.valueOf(booking.getTotalAmountValue())
                                .multiply(BigDecimal.valueOf(0.10))
                                .setScale(2, RoundingMode.HALF_UP)
                                .doubleValue()
                );
                if (!"PAID".equals(normalizePaymentStatus(booking.getAdminPaymentStatus()))) {
                    booking.setAdminPaymentStatus("PENDING_PAYMENT");
                }
            }

            if ("CANCELLED".equals(normalized) || "REJECTED".equals(normalized)) {
                booking.setAdminFeeAmount(null);
                booking.setAdminPaymentStatus(null);
                if ("CANCELLED".equals(normalized) && "DEPOSIT_PAID".equals(normalizePaymentStatus(booking.getPaymentStatus()))) {
                    booking.setRefundStatus("PENDING_REFUND");
                }
            }

            booking.setStatus(normalized);
            return bookingRepository.save(booking);
        }

        public Booking respondToBookingChange(String email, String bookingId, String action) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (!user.getId().equals(booking.getOrganizerId())) {
                        throw new RuntimeException("Unauthorized");
                }

                if ("ACCEPT".equalsIgnoreCase(action)) {
                        try {
                                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                                Map<String, Object> changes = mapper.readValue(booking.getRequestedDetailsJson(), Map.class);
                                
                                if (changes.containsKey("guests")) booking.setGuests((Integer) changes.get("guests"));
                                if (changes.containsKey("setup")) booking.setSetup((String) changes.get("setup"));
                                if (changes.containsKey("message")) booking.setMessage((String) changes.get("message"));
                                if (changes.containsKey("dateAndTime")) {
                                    String listJson = mapper.writeValueAsString(changes.get("dateAndTime"));
                                    List<BME.bridgemyevent.Model.BookingDateTime> dates = mapper.readValue(listJson, new com.fasterxml.jackson.core.type.TypeReference<List<BME.bridgemyevent.Model.BookingDateTime>>(){});
                                    booking.setDateAndTime(dates);
                                }
                                
                                booking.setChangeRequestStatus("ACCEPTED");
                        } catch (Exception e) {
                                throw new RuntimeException("Failed to apply changes");
                        }
                } else {
                        booking.setChangeRequestStatus("REJECTED");
                }

                booking.setRequestedDetailsJson(null);
                return bookingRepository.save(booking);
        }

        public Booking adjustBookingPrice(String email, String bookingId, Double adjustment) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (!user.getId().equals(booking.getOrganizerId())) {
                        throw new RuntimeException("Unauthorized");
                }

                booking.setPriceAdjustment(adjustment);
                recalculateAmounts(booking);
                return bookingRepository.save(booking);
        }

        public Booking refundBookingDeposit(String email, String bookingId) {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                Booking booking = bookingRepository.findById(bookingId)
                        .orElseThrow(() -> new RuntimeException("Booking not found"));

                if (!user.getId().equals(booking.getOrganizerId())) {
                        throw new RuntimeException("Unauthorized");
                }

                if (!"CANCELLED".equalsIgnoreCase(booking.getStatus())) {
                        throw new RuntimeException("Refund only available for cancelled events");
                }

                booking.setRefundStatus("REFUNDED");
                return bookingRepository.save(booking);
        }

        private void recalculateAmounts(Booking booking) {
            if (booking.getTotalAmountValue() == null) return;

            java.math.BigDecimal total = java.math.BigDecimal.valueOf(booking.getTotalAmountValue())
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal deposit = total.divide(java.math.BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_UP);
            
            double adjustment = booking.getPriceAdjustment() != null ? booking.getPriceAdjustment() : 0.0;
            java.math.BigDecimal finalAmt = total.subtract(deposit).add(java.math.BigDecimal.valueOf(adjustment));

            booking.setDepositAmount(deposit.doubleValue());
            booking.setFinalAmount(finalAmt.doubleValue());
        }


        public Booking payAdminFee(String email, String bookingId) {
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found"));

            if (!user.getId().equals(booking.getOrganizerId())) {
                throw new RuntimeException("Unauthorized");
            }

            String currentAdminStatus = booking.getAdminPaymentStatus() == null ? "" : booking.getAdminPaymentStatus().trim().toUpperCase();
            if (!"PENDING_PAYMENT".equals(currentAdminStatus)) {
                throw new RuntimeException("Admin payment is not pending");
            }
            if (!"COMPLETED".equals(booking.getStatus())) {
                throw new RuntimeException("Event must be completed before paying admin fee");
            }

            booking.setAdminPaymentStatus("AWAITING_CONFIRMATION");
            return bookingRepository.save(booking);
        }

        public Booking updateBookingPricing(String email, String bookingId, Double baseAmount, Double setupAmount, Double totalAmount) {
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found"));

            if (!user.getId().equals(booking.getOrganizerId())) {
                throw new RuntimeException("Unauthorized");
            }

            double existingBase = booking.getBaseAmountValue() == null ? 0d : booking.getBaseAmountValue();
            double existingSetup = booking.getSetupAmountValue() == null ? 0d : booking.getSetupAmountValue();

            double base = baseAmount == null ? existingBase : baseAmount;
            double setup = setupAmount == null ? existingSetup : setupAmount;
            double total = totalAmount == null ? base + setup : totalAmount;

            if (total <= 0) {
                throw new RuntimeException("Total amount must be greater than 0");
            }

            BigDecimal totalBd = BigDecimal.valueOf(total).setScale(2, RoundingMode.HALF_UP);
            BigDecimal deposit = totalBd.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            BigDecimal finalAmt = totalBd.subtract(deposit);

            booking.setBaseAmountValue(base > 0 ? base : null);
            booking.setSetupAmountValue(setup > 0 ? setup : null);
            booking.setTotalAmountValue(totalBd.doubleValue());
            booking.setTotalAmount(String.valueOf(totalBd.doubleValue()));
            booking.setDepositAmount(deposit.doubleValue());
            booking.setFinalAmount(finalAmt.doubleValue());

            booking.setBasePriceOnRequest(false);
            booking.setSetupPriceOnRequest(false);

            String status = booking.getStatus() == null ? "" : booking.getStatus().trim().toUpperCase();
            if ("PENDING_PAYMENT".equals(status)) {
                booking.setPaymentStatus("PENDING_DEPOSIT");
            } else if ("REQUESTED".equals(status)) {
                booking.setPaymentStatus("NOT_DUE");
            } else if (("RUNNING".equals(status) || "COMPLETED".equals(status))
                    && "DEPOSIT_PAID".equals(normalizePaymentStatus(booking.getPaymentStatus()))) {
                booking.setPaymentStatus("PENDING_FINAL");
            }

            return bookingRepository.save(booking);
        }

        private String normalizePaymentStatus(String status) {
            return status == null ? "" : status.trim().toUpperCase();
        }

        public Map<String, Object> getOrganizerAnalytics(String email) {
            try {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                List<Event> events = eventRepo.findByOrganizerId(user.getId());
                List<Booking> bookings = bookingRepository.findByOrganizerId(user.getId());
                List<Booking> validBookings = bookings.stream()
                        .filter(booking -> booking != null && !List.of("CANCELLED", "REJECTED").contains(normalizeBookingStatus(booking.getStatus())))
                        .toList();

                Map<String, Long> eventCounts = new LinkedHashMap<>();
                validBookings.forEach(booking -> {
                    String name = booking.getVenueName() == null || booking.getVenueName().isBlank() ? "Unknown Event" : booking.getVenueName();
                    eventCounts.put(name, eventCounts.getOrDefault(name, 0L) + 1);
                });

                List<Map<String, Object>> eventFrequency = eventCounts.entrySet().stream()
                        .filter(e -> e.getKey() != null && e.getValue() != null)
                        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                        .limit(8)
                        .map(entry -> Map.<String, Object>of(
                                "eventName", entry.getKey(),
                                "count", entry.getValue()
                        ))
                        .collect(Collectors.toList());

                Map<Integer, Integer> yearlyCounts = new LinkedHashMap<>();
                Map<String, Integer> monthlyCounts = new LinkedHashMap<>();
                validBookings.forEach(booking -> {
                    LocalDate date = resolveBookingDate(booking);
                    if (date == null) return;
                    yearlyCounts.put(date.getYear(), yearlyCounts.getOrDefault(date.getYear(), 0) + 1);
                    String monthKey = YearMonth.from(date).toString();
                    monthlyCounts.put(monthKey, monthlyCounts.getOrDefault(monthKey, 0) + 1);
                });

                List<Map<String, Object>> monthlyTrend = monthlyCounts.entrySet().stream()
                        .filter(e -> e.getKey() != null && e.getValue() != null)
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> {
                            YearMonth ym;
                            try {
                                ym = YearMonth.parse(entry.getKey()); // expects yyyy-MM
                            } catch (Exception ex) {
                                ym = null;
                            }
                
                            String label = (ym == null)
                                    ? entry.getKey()
                                    : ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear();
                
                            return Map.<String, Object>of(
                                    "monthKey", entry.getKey(),
                                    "label", label,
                                    "count", entry.getValue()
                            );
                        })
                        .collect(Collectors.toList());
                
                List<Map<String, Object>> yearlyTrend = yearlyCounts.entrySet().stream()
                        .filter(e -> e.getKey() != null && e.getValue() != null)
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> Map.<String, Object>of(
                                "year", entry.getKey(),
                                "count", entry.getValue()
                        ))
                        .collect(Collectors.toList());

                return Map.of(
                        "totalEvents", events.size(),
                        "totalBookings", bookings.size(),
                        "validBookings", validBookings.size(),
                        "eventFrequency", eventFrequency,
                        "monthlyTrend", monthlyTrend,
                        "yearlyTrend", yearlyTrend
                );
            } catch (Exception ex) {
                return Map.of(
                        "totalEvents", 0,
                        "totalBookings", 0,
                        "validBookings", 0,
                        "eventFrequency", List.of(),
                        "monthlyTrend", List.of(),
                        "yearlyTrend", List.of()
                );
            }
        }

        public Map<String, Object> getOrganizerEarnings(String email) {
            try {
                User user = userRepo.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                List<Booking> bookings = bookingRepository.findByOrganizerId(user.getId());
                List<Booking> revenueBookings = bookings.stream()
                        .filter(booking -> booking != null && "COMPLETED".equals(normalizeBookingStatus(booking.getStatus())))
                        .toList();

            double totalRevenue = revenueBookings.stream()
                    .mapToDouble(booking -> booking.getTotalAmountValue() == null ? 0d : booking.getTotalAmountValue())
                    .sum();
            double totalAdminFee = revenueBookings.stream()
                    .mapToDouble(booking -> booking.getAdminFeeAmount() == null ? 0d : booking.getAdminFeeAmount())
                    .sum();
            double totalProfit = totalRevenue - totalAdminFee;

            Map<Integer, double[]> yearly = new LinkedHashMap<>();
            Map<String, double[]> monthly = new LinkedHashMap<>();
            for (Booking booking : revenueBookings) {
                LocalDate date = resolveBookingDate(booking);
                if (date == null) continue;
                double revenue = booking.getTotalAmountValue() == null ? 0d : booking.getTotalAmountValue();
                double adminFee = booking.getAdminFeeAmount() == null ? 0d : booking.getAdminFeeAmount();
                double profit = revenue - adminFee;

                yearly.computeIfAbsent(date.getYear(), key -> new double[]{0d, 0d, 0d});
                yearly.get(date.getYear())[0] += revenue;
                yearly.get(date.getYear())[1] += adminFee;
                yearly.get(date.getYear())[2] += profit;

                String monthKey = YearMonth.from(date).toString();
                monthly.computeIfAbsent(monthKey, key -> new double[]{0d, 0d, 0d});
                monthly.get(monthKey)[0] += revenue;
                monthly.get(monthKey)[1] += adminFee;
                monthly.get(monthKey)[2] += profit;
            }

                List<Map<String, Object>> yearlySummary = yearly.entrySet().stream()
                        .filter(e -> e.getKey() != null && e.getValue() != null)
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> {
                            double[] val = entry.getValue();
                            return Map.<String, Object>of(
                                    "year", entry.getKey(),
                                    "revenue", round(val != null && val.length > 0 ? val[0] : 0d),
                                    "adminFee", round(val != null && val.length > 1 ? val[1] : 0d),
                                    "profit", round(val != null && val.length > 2 ? val[2] : 0d)
                            );
                        })
                        .collect(Collectors.toList());
                
                List<Map<String, Object>> monthlySummary = monthly.entrySet().stream()
                        .filter(e -> e.getKey() != null && e.getValue() != null)
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> {
                            double[] val = entry.getValue();
                
                            YearMonth ym;
                            try {
                                ym = YearMonth.parse(entry.getKey()); // expects yyyy-MM
                            } catch (Exception ex) {
                                ym = null;
                            }
                
                            String label = (ym == null)
                                    ? entry.getKey()
                                    : ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear();
                
                            return Map.<String, Object>of(
                                    "monthKey", entry.getKey(),
                                    "label", label,
                                    "revenue", round(val != null && val.length > 0 ? val[0] : 0d),
                                    "adminFee", round(val != null && val.length > 1 ? val[1] : 0d),
                                    "profit", round(val != null && val.length > 2 ? val[2] : 0d)
                            );
                        })
                        .collect(Collectors.toList());
                
                List<Map<String, Object>> statements = revenueBookings.stream()
                        .sorted(Comparator.comparing(
                                this::resolveBookingDate,
                                Comparator.nullsLast(Comparator.reverseOrder())
                        ))
                        .map(booking -> {
                            LocalDate date = resolveBookingDate(booking);
                
                            double revenue = booking.getTotalAmountValue() != null ? booking.getTotalAmountValue() : 0d;
                            double adminFee = booking.getAdminFeeAmount() != null ? booking.getAdminFeeAmount() : 0d;
                
                            return Map.<String, Object>of(
                                    "bookingId", booking.getId(),
                                    "eventName", booking.getVenueName() != null ? booking.getVenueName() : "Event",
                                    "clientName", booking.getClientName() != null ? booking.getClientName() : "Client",
                                    "date", date != null ? date.toString() : "-",
                                    "revenue", round(revenue),
                                    "adminFee", round(adminFee),
                                    "profit", round(revenue - adminFee),
                                    "paymentStatus", booking.getPaymentStatus() != null ? booking.getPaymentStatus() : "-",
                                    "adminPaymentStatus", booking.getAdminPaymentStatus() != null ? booking.getAdminPaymentStatus() : "-"
                            );
                        })
                        .collect(Collectors.toList());

                return Map.of(
                        "totalRevenue", round(totalRevenue),
                        "totalAdminFee", round(totalAdminFee),
                        "totalProfit", round(totalProfit),
                        "completedBookings", revenueBookings.size(),
                        "monthlySummary", monthlySummary,
                        "yearlySummary", yearlySummary,
                        "statements", statements
                );
            } catch (Exception ex) {
                return Map.of(
                        "totalRevenue", 0,
                        "totalAdminFee", 0,
                        "totalProfit", 0,
                        "completedBookings", 0,
                        "monthlySummary", List.of(),
                        "yearlySummary", List.of(),
                        "statements", List.of()
                );
            }
        }

        private LocalDate resolveBookingDate(Booking booking) {
            if (booking == null || booking.getDateAndTime() == null || booking.getDateAndTime().isEmpty()) {
                return null;
            }
            BookingDateTime slot = booking.getDateAndTime().stream()
                    .filter(item -> item != null && item.getDate() != null && !item.getDate().isBlank())
                    .findFirst()
                    .orElse(null);
            if (slot == null) return null;
            String raw = slot.getDate();
            if (raw == null || raw.isBlank()) return null;
            String clean = raw.trim();
            for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                try {
                    return LocalDate.parse(clean, formatter);
                } catch (DateTimeParseException ignored) {
                }
            }
            return null;
        }

        private String normalizeBookingStatus(String status) {
            return status == null ? "" : status.trim().toUpperCase();
        }

        private double round(double value) {
            return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
        }

}
