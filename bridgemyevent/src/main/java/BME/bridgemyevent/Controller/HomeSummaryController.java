package BME.bridgemyevent.Controller;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import BME.bridgemyevent.Enum.UserRole;
import BME.bridgemyevent.Model.Booking;
import BME.bridgemyevent.Model.BookingDateTime;
import BME.bridgemyevent.Model.User;
import BME.bridgemyevent.Repository.BookingRepository;
import BME.bridgemyevent.Repository.UserRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/home")
@RequiredArgsConstructor
public class HomeSummaryController {

    private static final Set<String> ORGANIZED_BOOKING_STATUSES = Set.of("CONFIRMED", "RUNNING", "COMPLETED");

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH));

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @GetMapping("/summary")
    public Map<String, Object> getHomeSummary() {
        List<User> users = userRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();

        long clients = users.stream()
                .filter(user -> user.getRole() == UserRole.CLIENT)
                .filter(user -> !"DELETED".equals(normalizeStatus(user.getStatus())))
                .count();

        long organizers = users.stream()
                .filter(user -> user.getRole() == UserRole.ORGANIZER)
                .filter(user -> !"DELETED".equals(normalizeStatus(user.getStatus())))
                .count();

        Map<YearMonth, Long> monthlyCounts = new HashMap<>();
        Map<Integer, Long> yearlyCounts = new HashMap<>();

        bookings.stream()
                .filter(booking -> ORGANIZED_BOOKING_STATUSES.contains(normalizeStatus(booking.getStatus())))
                .map(this::resolveBookingDate)
                .filter(date -> date != null)
                .forEach(date -> {
                    YearMonth month = YearMonth.from(date);
                    monthlyCounts.put(month, monthlyCounts.getOrDefault(month, 0L) + 1);
                    yearlyCounts.put(date.getYear(), yearlyCounts.getOrDefault(date.getYear(), 0L) + 1);
                });

        long avgMonthlyEvents = average(monthlyCounts);
        long avgYearlyEvents = average(yearlyCounts);

        return Map.of(
                "clients", clients,
                "organizers", organizers,
                "avgMonthlyEvents", avgMonthlyEvents,
                "avgYearlyEvents", avgYearlyEvents);
    }

    private long average(Map<?, Long> counts) {
        if (counts.isEmpty()) {
            return 0L;
        }
        double average = counts.values().stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0d);
        return Math.round(average);
    }

    private LocalDate resolveBookingDate(Booking booking) {
        if (booking == null || booking.getDateAndTime() == null || booking.getDateAndTime().isEmpty()) {
            return null;
        }

        BookingDateTime slot = booking.getDateAndTime().stream()
                .filter(item -> item != null && item.getDate() != null && !item.getDate().isBlank())
                .findFirst()
                .orElse(null);

        if (slot == null) {
            return null;
        }

        String clean = slot.getDate().trim();
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(clean, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private String normalizeStatus(String status) {
        return status == null || status.isBlank() ? "ACTIVE" : status.trim().toUpperCase();
    }
}
