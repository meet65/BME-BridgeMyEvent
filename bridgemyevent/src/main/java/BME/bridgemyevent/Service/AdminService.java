package BME.bridgemyevent.Service;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import BME.bridgemyevent.Dto.AdminOrganizerDTO;
import BME.bridgemyevent.Enum.UserRole;
import BME.bridgemyevent.Model.Booking;
import BME.bridgemyevent.Model.BookingDateTime;
import BME.bridgemyevent.Model.ClientProfile;
import BME.bridgemyevent.Model.Event;
import BME.bridgemyevent.Model.OrganizerProfile;
import BME.bridgemyevent.Model.Review;
import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Repository.BookingRepository;
import BME.bridgemyevent.Repository.ClientProfileRepository;
import BME.bridgemyevent.Repository.EventRepository;
import BME.bridgemyevent.Repository.OrganizerProfileRepository;
import BME.bridgemyevent.Repository.ReviewRepository;
import BME.bridgemyevent.Repository.UserRepository;

@Service
public class AdminService {

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH)
    );

    private static final List<String> ALLOWED_USER_STATUSES = List.of(
            "ACTIVE", "APPROVED", "PENDING", "REJECTED", "SUSPENDED", "DELETED");

    private static final List<String> ALLOWED_EVENT_STATUSES = List.of(
            "PUBLISHED", "HIDDEN", "FLAGGED", "DELETED");

    private static final List<String> ALLOWED_BOOKING_STATUSES = List.of(
            "REQUESTED", "CONFIRMED", "RUNNING", "COMPLETED", "CANCELLED");

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private OrganizerProfileRepository organizerRepo;

    @Autowired
    private ClientProfileRepository clientProfileRepo;

    @Autowired
    private EventRepository eventRepo;

    @Autowired
    private BookingRepository bookingRepo;

    @Autowired
    private ReviewRepository reviewRepo;

    public Map<String, Object> getDashboardSummary() {
        List<User> users = userRepo.findAll();
        List<Event> events = eventRepo.findAll();
        List<Booking> bookings = bookingRepo.findAll();

        long totalUsers = users.stream()
                .filter(u -> !"DELETED".equals(normalizeUserStatus(u.getStatus())))
                .count();
        long totalOrganizers = users.stream()
                .filter(u -> u.getRole() == UserRole.ORGANIZER)
                .filter(u -> !"DELETED".equals(normalizeUserStatus(u.getStatus())))
                .count();
        long totalClients = users.stream()
                .filter(u -> u.getRole() == UserRole.CLIENT)
                .filter(u -> !"DELETED".equals(normalizeUserStatus(u.getStatus())))
                .count();
        long pendingApprovals = users.stream()
                .filter(user -> user.getRole() == UserRole.ORGANIZER)
                .filter(user -> "PENDING".equals(normalizeUserStatus(user.getStatus())))
                .count();
        long activeUsers = users.stream()
                .filter(user -> List.of("ACTIVE", "APPROVED").contains(normalizeUserStatus(user.getStatus())))
                .count();
        long suspendedUsers = users.stream()
                .filter(user -> "SUSPENDED".equals(normalizeUserStatus(user.getStatus())))
                .count();
        
        long totalEvents = events.stream()
                .filter(e -> !"DELETED".equals(normalizeEventStatus(e.getAdminStatus())))
                .count();
        long publishedEvents = events.stream()
                .filter(event -> "PUBLISHED".equals(normalizeEventStatus(event.getAdminStatus())))
                .count();
        long hiddenEvents = events.stream()
                .filter(event -> "HIDDEN".equals(normalizeEventStatus(event.getAdminStatus())))
                .count();
        long flaggedEvents = events.stream()
                .filter(event -> "FLAGGED".equals(normalizeEventStatus(event.getAdminStatus())))
                .count();

        Map<String, Object> data = new HashMap<>();
        data.put("totalUsers", totalUsers);
        data.put("totalOrganizers", totalOrganizers);
        data.put("totalClients", totalClients);
        data.put("pendingApprovals", pendingApprovals);
        data.put("activeUsers", activeUsers);
        data.put("suspendedUsers", suspendedUsers);
        data.put("totalEvents", totalEvents);
        data.put("publishedEvents", publishedEvents);
        data.put("hiddenEvents", hiddenEvents);
        data.put("flaggedEvents", flaggedEvents);
        data.put("totalBookings", bookings.size());
        data.put("recentActivity", buildRecentActivity(users, events));
        return data;
    }

    public Map<String, Object> getAnalyticsSummary() {
        List<Event> events = eventRepo.findAll();
        List<Booking> bookings = bookingRepo.findAll();
        List<Booking> validBookings = bookings.stream()
                .filter(booking -> !List.of("CANCELLED", "REJECTED").contains(normalizeBookingStatus(booking.getStatus())))
                .toList();

        Map<String, Long> eventCounts = new LinkedHashMap<>();
        validBookings.forEach(booking -> {
            String eventName = booking.getVenueName() == null || booking.getVenueName().isBlank() ? "Unknown Event" : booking.getVenueName();
            eventCounts.put(eventName, eventCounts.getOrDefault(eventName, 0L) + 1);
        });

        List<Map<String, Object>> eventFrequency = eventCounts.entrySet().stream()
        .filter(entry -> entry.getKey() != null && entry.getValue() != null)
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
        .limit(10)
        .map(entry -> {
            Map<String, Object> map = new HashMap<>();
            map.put("eventName", entry.getKey());
            map.put("count", entry.getValue());
            return map;
        })
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
        .filter(entry -> entry.getKey() != null && entry.getValue() != null)
        .sorted(Map.Entry.comparingByKey())
        .map(entry -> {
            YearMonth ym = YearMonth.parse(entry.getKey());
            String label = ym.getMonth()
                    .getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                    + " " + ym.getYear();

            return Map.<String, Object>of(
                    "monthKey", entry.getKey(),
                    "label", label,
                    "count", entry.getValue()
            );
        })
        .collect(Collectors.toList());

List<Map<String, Object>> yearlyTrend = yearlyCounts.entrySet().stream()
        .filter(entry -> entry.getKey() != null && entry.getValue() != null)
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
    }

    public Map<String, Object> getEarningsSummary() {
        List<Booking> bookings = bookingRepo.findAll();
        List<Booking> completed = bookings.stream()
                .filter(booking -> "COMPLETED".equals(normalizeBookingStatus(booking.getStatus())))
                .toList();

        double totalRevenue = completed.stream()
                .mapToDouble(booking -> booking.getTotalAmountValue() == null ? 0d : booking.getTotalAmountValue())
                .sum();
        double totalAdminFee = completed.stream()
                .mapToDouble(booking -> booking.getAdminFeeAmount() == null ? 0d : booking.getAdminFeeAmount())
                .sum();

        Map<Integer, double[]> yearly = new LinkedHashMap<>();
        Map<String, double[]> monthly = new LinkedHashMap<>();
        for (Booking booking : completed) {
            LocalDate date = resolveBookingDate(booking);
            if (date == null) continue;

            double revenue = booking.getTotalAmountValue() == null ? 0d : booking.getTotalAmountValue();
            double adminFee = booking.getAdminFeeAmount() == null ? 0d : booking.getAdminFeeAmount();

            yearly.computeIfAbsent(date.getYear(), key -> new double[]{0d, 0d});
            yearly.get(date.getYear())[0] += revenue;
            yearly.get(date.getYear())[1] += adminFee;

            String monthKey = YearMonth.from(date).toString();
            monthly.computeIfAbsent(monthKey, key -> new double[]{0d, 0d});
            monthly.get(monthKey)[0] += revenue;
            monthly.get(monthKey)[1] += adminFee;
        }

        List<Map<String, Object>> yearlySummary = yearly.entrySet().stream()
        .filter(e -> e.getKey() != null && e.getValue() != null)
        .sorted(Map.Entry.comparingByKey())
        .map(entry -> {
            double[] val = entry.getValue();
            return Map.<String, Object>of(
                    "year", entry.getKey(),
                    "grossRevenue", round(val != null && val.length > 0 ? val[0] : 0d),
                    "adminFees", round(val != null && val.length > 1 ? val[1] : 0d)
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
                            "grossRevenue", round(val != null && val.length > 0 ? val[0] : 0d),
                            "adminFees", round(val != null && val.length > 1 ? val[1] : 0d)
                    );
                })
                .collect(Collectors.toList());
        
        List<Map<String, Object>> statements = completed.stream()
                .sorted(Comparator.comparing(
                        this::resolveBookingDate,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(booking -> {
                    LocalDate date = resolveBookingDate(booking);
        
                    return Map.<String, Object>of(
                            "bookingId", booking.getId(),
                            "eventName", booking.getVenueName() != null ? booking.getVenueName() : "Event",
                            "organizerName", booking.getCompanyName() != null ? booking.getCompanyName() : "Organizer",
                            "clientName", booking.getClientName() != null ? booking.getClientName() : "Client",
                            "date", date != null ? date.toString() : "-",
                            "grossRevenue", round(booking.getTotalAmountValue() != null ? booking.getTotalAmountValue() : 0d),
                            "adminFee", round(booking.getAdminFeeAmount() != null ? booking.getAdminFeeAmount() : 0d),
                            "adminPaymentStatus", booking.getAdminPaymentStatus() != null ? booking.getAdminPaymentStatus() : "-"
                    );
                })
                .collect(Collectors.toList());

        return Map.of(
                "totalGrossRevenue", round(totalRevenue),
                "totalAdminFees", round(totalAdminFee),
                "completedBookings", completed.size(),
                "monthlySummary", monthlySummary,
                "yearlySummary", yearlySummary,
                "statements", statements
        );
    }

    public List<AdminOrganizerDTO> getPendingOrganizers() {
        return getOrganizersByStatus("PENDING");
    }

    public List<AdminOrganizerDTO> getOrganizersByStatus(String status) {
        return userRepo.findAll().stream()
                .filter(user -> user.getRole() == UserRole.ORGANIZER)
                .filter(user -> status == null || status.isBlank()
                        || normalizeUserStatus(user.getStatus()).equals(normalizeUserStatus(status)))
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(user -> new AdminOrganizerDTO(user, organizerRepo.findByUserId(user.getId()).orElse(null)))
                .toList();
    }

    public Map<String, Object> getOrganizerDetails(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Organizer not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("fullName", user.getFullName());
        data.put("email", user.getEmail());
        data.put("status", normalizeUserStatus(user.getStatus()));
        data.put("companyName", profile.getCompanyName());
        data.put("experience", profile.getExperience());
        data.put("events", profile.getEvents());
        data.put("description", profile.getDescription());
        data.put("about", profile.getAbout());
        data.put("gst", profile.getGst());
        data.put("city", profile.getCity());
        data.put("state", profile.getState());
        data.put("locations", profile.getLocations());
        data.put("contactNumber", profile.getContactNumber());
        data.put("instagram", profile.getInstagram());
        data.put("facebook", profile.getFacebook());
        data.put("youTube", profile.getYouTube());
        data.put("website", profile.getWebsite());
        data.put("portfolio", profile.getPortfolio());
        data.put("approvalStatus", profile.getApprovalStatus());
        data.put("profileImage", profile.getProfileImage());
        data.put("rating", calculateAverageRating(profile.getUserId()));
        data.put("reviewCount", reviewRepo.findByOrganizerId(profile.getUserId()).size());
        data.put("createdAt", profile.getCreatedAt());
        return data;
    }

    public void approveOrganizer(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        user.setStatus("APPROVED");
        profile.setApprovalStatus("APPROVED");

        userRepo.save(user);
        organizerRepo.save(profile);
    }

    public void rejectOrganizer(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganizerProfile profile = organizerRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setApprovalStatus("REJECTED");
        organizerRepo.save(profile);

        user.setStatus("REJECTED");
        userRepo.save(user);
    }

    public List<Map<String, Object>> getAllUsers() {
        List<Booking> bookings = bookingRepo.findAll();
        return userRepo.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(user -> toUserSummary(user, bookings))
                .toList();
    }

    public Map<String, Object> getUserDetails(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Booking> bookings = bookingRepo.findAll();
        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("fullName", user.getFullName());
        data.put("email", user.getEmail());
        data.put("phone", user.getPhone());
        data.put("role", user.getRole());
        data.put("status", normalizeUserStatus(user.getStatus()));
        data.put("createdAt", user.getCreatedAt());
        data.put("bookingCount", countUserBookings(user.getId(), bookings));

        if (user.getRole() == UserRole.CLIENT) {
            ClientProfile profile = clientProfileRepo.findByUserId(userId).orElse(null);
            data.put("profileType", "CLIENT");
            if (profile != null) {
                data.put("userName", profile.getUserName());
                data.put("city", profile.getCity());
                data.put("state", profile.getState());
                data.put("about", profile.getAbout());
                data.put("profileImage", profile.getProfileImage());
            }
        } else if (user.getRole() == UserRole.ORGANIZER) {
            OrganizerProfile profile = organizerRepo.findByUserId(userId).orElse(null);
            data.put("profileType", "ORGANIZER");
            if (profile != null) {
                data.put("companyName", profile.getCompanyName());
                data.put("city", profile.getCity());
                data.put("state", profile.getState());
                data.put("locations", profile.getLocations());
                data.put("contactNumber", profile.getContactNumber());
                data.put("experience", profile.getExperience());
                data.put("gst", profile.getGst());
                data.put("events", profile.getEvents());
                data.put("about", profile.getAbout());
                data.put("description", profile.getDescription());
                data.put("profileImage", profile.getProfileImage());
                data.put("approvalStatus", profile.getApprovalStatus());
            }
        } else {
            data.put("profileType", "ADMIN");
        }

        return data;
    }

    public Map<String, Object> updateUserStatus(String userId, String status) {
        String normalized = normalizeUserStatus(status);
        if (!ALLOWED_USER_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid user status");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == UserRole.ADMIN) {
            throw new RuntimeException("Admin accounts cannot be modified here");
        }

        user.setStatus(normalized);
        userRepo.save(user);

        if (user.getRole() == UserRole.ORGANIZER) {
            organizerRepo.findByUserId(userId).ifPresent(profile -> {
                if ("APPROVED".equals(normalized) || "ACTIVE".equals(normalized)) {
                    profile.setApprovalStatus("APPROVED");
                } else if ("PENDING".equals(normalized) || "REJECTED".equals(normalized)) {
                    profile.setApprovalStatus(normalized);
                }
                organizerRepo.save(profile);
            });
        }

        return Map.of(
                "message", "User status updated",
                "status", normalized);
    }

    public Map<String, String> deleteUser(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == UserRole.ADMIN) {
            throw new RuntimeException("Admin accounts cannot be deleted");
        }

        user.setStatus("DELETED");
        userRepo.save(user);

        if (user.getRole() == UserRole.ORGANIZER) {
            organizerRepo.findByUserId(userId).ifPresent(profile -> {
                profile.setApprovalStatus("DELETED");
                organizerRepo.save(profile);
            });
            List<Event> organizerEvents = eventRepo.findByOrganizerId(userId);
            for (Event e : organizerEvents) {
                e.setAdminStatus("DELETED");
                eventRepo.save(e);
            }
        }

        return Map.of("message", "User deleted");
    }

    public List<Map<String, Object>> getAllEvents() {
        List<Booking> bookings = bookingRepo.findAll();
        return eventRepo.findAll().stream()
                .sorted(Comparator.comparing(Event::getVenueName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(event -> toEventSummary(event, bookings))
                .toList();
    }

    public List<Map<String, Object>> getAllBookings() {
        List<Booking> bookings = bookingRepo.findAll();
        Map<String, Event> eventMap = new HashMap<>();
        eventRepo.findAll().forEach(event -> eventMap.put(event.getId(), event));

        return bookings.stream()
                .sorted(Comparator.comparing(Booking::getClientName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(booking -> toBookingSummary(booking, eventMap.get(booking.getEventId())))
                .toList();
    }

    public Map<String, Object> getBookingDetails(String bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        Event event = eventRepo.findById(booking.getEventId()).orElse(null);

        Map<String, Object> data = new HashMap<>();
        data.put("id", booking.getId());
        data.put("eventId", booking.getEventId());
        data.put("clientId", booking.getClientId());
        data.put("clientName", booking.getClientName());
        data.put("clientEmail", booking.getClientEmail());
        data.put("clientPhone", booking.getClientPhone());
        data.put("clientProfileImage", booking.getClientProfileImage());
        data.put("organizerId", booking.getOrganizerId());
        data.put("organizerName", booking.getCompanyName());
        data.put("eventName", booking.getVenueName());
        data.put("eventType", booking.getEventType());
        data.put("venueName", booking.getVenueName());
        data.put("city", booking.getCity());
        data.put("guests", booking.getGuests());
        data.put("dateAndTime", booking.getDateAndTime());
        data.put("setup", booking.getSetup());
        data.put("message", booking.getMessage());
        data.put("totalAmount", booking.getTotalAmount());
        data.put("totalAmountValue", booking.getTotalAmountValue());
        data.put("depositAmount", booking.getDepositAmount());
        data.put("paidAmount", booking.getPaidAmount());
        data.put("paymentStatus", booking.getPaymentStatus());
        data.put("adminFeeAmount", booking.getAdminFeeAmount());
        data.put("adminPaymentStatus", booking.getAdminPaymentStatus());
        data.put("paymentCurrency", booking.getPaymentCurrency());
        data.put("lastPaymentStage", booking.getLastPaymentStage());
        data.put("lastOrderId", booking.getLastOrderId());
        data.put("lastPaymentId", booking.getLastPaymentId());
        data.put("status", normalizeBookingStatus(booking.getStatus()));
        data.put("eventStatus", event == null ? "UNKNOWN" : normalizeEventStatus(event.getAdminStatus()));
        return data;
    }

    public Map<String, Object> updateBookingStatus(String bookingId, String status) {
        String normalized = normalizeBookingStatus(status);
        if (!ALLOWED_BOOKING_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid booking status");
        }

        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setStatus(normalized);
        bookingRepo.save(booking);

        return Map.of(
                "message", "Booking status updated",
                "status", normalized);
    }

    public Map<String, Object> completeBookingAdminPayment(String bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        String currentAdminStatus = booking.getAdminPaymentStatus() == null ? "" : booking.getAdminPaymentStatus().trim().toUpperCase();
        if (!"AWAITING_CONFIRMATION".equals(currentAdminStatus) && !"PENDING_PAYMENT".equals(currentAdminStatus)) {
            throw new RuntimeException("Admin payment is not awaiting confirmation or pending");
        }
        if (!"COMPLETED".equals(booking.getStatus())) {
            throw new RuntimeException("Booking must be completed before marking admin payment complete");
        }
        booking.setAdminPaymentStatus("PAID");
        bookingRepo.save(booking);
        return Map.of(
                "message", "Admin payment completed",
                "adminPaymentStatus", booking.getAdminPaymentStatus());
    }

    public Map<String, String> deleteBooking(String bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        bookingRepo.delete(booking);
        return Map.of("message", "Booking deleted");
    }

    private Map<String, Object> toBookingSummary(Booking booking, Event event) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", booking.getId());
        row.put("eventId", booking.getEventId());
        row.put("clientName", booking.getClientName());
        row.put("clientEmail", booking.getClientEmail());
        row.put("organizerName", booking.getCompanyName());
        row.put("eventName", booking.getVenueName());
        row.put("venueName", booking.getVenueName());
        row.put("city", booking.getCity());
        row.put("guests", booking.getGuests());
        row.put("dateAndTime", booking.getDateAndTime());
        row.put("status", normalizeBookingStatus(booking.getStatus()));
        row.put("eventStatus", event == null ? "UNKNOWN" : normalizeEventStatus(event.getAdminStatus()));
        row.put("paymentStatus", booking.getPaymentStatus());
        row.put("adminFeeAmount", booking.getAdminFeeAmount());
        row.put("adminPaymentStatus", booking.getAdminPaymentStatus());
        row.put("totalAmount", booking.getTotalAmount());
        row.put("totalAmountValue", booking.getTotalAmountValue());
        return row;
    }

    private String normalizeBookingStatus(String status) {
        if (status == null || status.isBlank()) {
            return "REQUESTED";
        }
        return status.trim().toUpperCase();
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

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public Map<String, Object> getEventDetails(String eventId) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        Map<String, Object> data = new HashMap<>();
        data.put("id", event.getId());
        data.put("organizerId", event.getOrganizerId());
        data.put("companyName", event.getCompanyName());
        data.put("venueName", event.getVenueName());
        data.put("venueType", event.getVenueType());
        data.put("location", event.getLocation());
        data.put("city", event.getCity());
        data.put("contactNumber", event.getContactNumber());
        data.put("description", event.getDescription());
        data.put("priceType", event.getPriceType());
        data.put("priceUnit", event.getPriceUnit());
        data.put("priceAmount", event.getPriceAmount());
        data.put("minCapacity", event.getMinCapacity());
        data.put("maxCapacity", event.getMaxCapacity());
        data.put("availabilityDataType", event.getAvailabilityDataType());
        data.put("availabilityData", event.getAvailabilityData());
        data.put("amenities", event.getAmenities());
        data.put("supportedEvents", event.getSupportedEvents());
        data.put("setups", event.getSetups());
        data.put("adminStatus", normalizeEventStatus(event.getAdminStatus()));
        data.put("bookingCount", bookingRepo.findByEventId(eventId).size());
        return data;
    }

    public Map<String, Object> updateEventStatus(String eventId, String status) {
        String normalized = normalizeEventStatus(status);
        if (!ALLOWED_EVENT_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid event status");
        }

        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        event.setAdminStatus(normalized);
        eventRepo.save(event);

        return Map.of(
                "message", "Event status updated",
                "status", normalized);
    }

    public Map<String, String> deleteEvent(String eventId) {
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        event.setAdminStatus("DELETED");
        eventRepo.save(event);
        return Map.of("message", "Event deleted");
    }

    private Map<String, Object> toUserSummary(User user, List<Booking> bookings) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", user.getId());
        row.put("fullName", user.getFullName());
        row.put("email", user.getEmail());
        row.put("role", user.getRole());
        row.put("status", normalizeUserStatus(user.getStatus()));
        row.put("createdAt", user.getCreatedAt());
        row.put("bookingCount", countUserBookings(user.getId(), bookings));
        row.put("city", resolveUserCity(user));
        row.put("profileImage", resolveUserProfileImage(user));
        return row;
    }

    private Map<String, Object> toEventSummary(Event event, List<Booking> bookings) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", event.getId());
        row.put("venueName", event.getVenueName());
        row.put("companyName", event.getCompanyName());
        row.put("organizerId", event.getOrganizerId());
        row.put("city", event.getCity());
        row.put("location", event.getLocation());
        row.put("priceAmount", event.getPriceAmount());
        row.put("priceType", event.getPriceType());
        row.put("supportedEvents", event.getSupportedEvents());
        row.put("adminStatus", normalizeEventStatus(event.getAdminStatus()));
        row.put("bookingCount", bookings.stream()
                .filter(booking -> event.getId().equals(booking.getEventId()))
                .count());
        return row;
    }

    private long countUserBookings(String userId, List<Booking> bookings) {
        return bookings.stream()
                .filter(booking -> userId.equals(booking.getClientId()) || userId.equals(booking.getOrganizerId()))
                .count();
    }

    private String resolveUserCity(User user) {
        if (user.getRole() == UserRole.CLIENT) {
            return clientProfileRepo.findByUserId(user.getId())
                    .map(ClientProfile::getCity)
                    .orElse("-");
        }
        if (user.getRole() == UserRole.ORGANIZER) {
            return organizerRepo.findByUserId(user.getId())
                    .map(OrganizerProfile::getCity)
                    .orElse("-");
        }
        return "-";
    }

    private String resolveUserProfileImage(User user) {
        if (user.getRole() == UserRole.CLIENT) {
            return clientProfileRepo.findByUserId(user.getId())
                    .map(ClientProfile::getProfileImage)
                    .orElse(null);
        }
        if (user.getRole() == UserRole.ORGANIZER) {
            return organizerRepo.findByUserId(user.getId())
                    .map(OrganizerProfile::getProfileImage)
                    .orElse(null);
        }
        return null;
    }

    private double calculateAverageRating(String organizerId) {
        List<Review> reviews = reviewRepo.findByOrganizerId(organizerId);
        if (reviews == null || reviews.isEmpty()) {
            return 0d;
        }
        return reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0d);
    }

    private List<Map<String, Object>> buildRecentActivity(List<User> users, List<Event> events) {
        List<Map<String, Object>> items = new ArrayList<>();

        users.stream()
                .filter(user -> user.getRole() == UserRole.ORGANIZER)
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(3)
                .forEach(user -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("type", "organizer");
                    item.put("title", user.getFullName() + " requested organizer access");
                    item.put("time", formatDateTime(user.getCreatedAt()));
                    item.put("status", normalizeUserStatus(user.getStatus()));
                    items.add(item);
                });

        events.stream()
                .sorted(Comparator.comparing(Event::getVenueName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .limit(3)
                .forEach(event -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("type", "event");
                    item.put("title", event.getVenueName() + " is " + normalizeEventStatus(event.getAdminStatus()));
                    item.put("time", event.getCity() == null ? "-" : event.getCity());
                    item.put("status", normalizeEventStatus(event.getAdminStatus()));
                    items.add(item);
                });

        return items;
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return "-";
        }
        return value.format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
    }

    private String normalizeUserStatus(String status) {
        return status == null || status.isBlank() ? "ACTIVE" : status.trim().toUpperCase();
    }

    private String normalizeEventStatus(String status) {
        return status == null || status.isBlank() ? "PUBLISHED" : status.trim().toUpperCase();
    }
}
