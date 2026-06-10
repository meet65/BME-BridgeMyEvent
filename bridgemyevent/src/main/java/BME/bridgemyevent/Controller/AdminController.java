package BME.bridgemyevent.Controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import BME.bridgemyevent.Dto.AdminOrganizerDTO;
import BME.bridgemyevent.Service.AdminService;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return adminService.getDashboardSummary();
    }

    @GetMapping("/analytics")
    public Map<String, Object> analytics() {
        return adminService.getAnalyticsSummary();
    }

    @GetMapping("/earnings")
    public Map<String, Object> earnings() {
        return adminService.getEarningsSummary();
    }

    @GetMapping("/organizers/pending")
    public List<AdminOrganizerDTO> pending() {
        return adminService.getPendingOrganizers();
    }

    @GetMapping("/organizers")
    public List<AdminOrganizerDTO> organizers(@RequestParam(required = false) String status) {
        return adminService.getOrganizersByStatus(status);
    }

    @GetMapping("/organizer/{id}")
    public Map<String, Object> getOrganizerDetails(@PathVariable String id) {
        return adminService.getOrganizerDetails(id);
    }

    @PutMapping("/organizer/{id}/approve")
    public String approve(@PathVariable String id) {
        adminService.approveOrganizer(id);
        return "Organizer approved";
    }

    @PutMapping("/organizer/{id}/reject")
    public String reject(@PathVariable String id) {
        adminService.rejectOrganizer(id);
        return "Organizer rejected";
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        return adminService.getAllUsers();
    }

    @GetMapping("/users/{id}")
    public Map<String, Object> getUser(@PathVariable String id) {
        return adminService.getUserDetails(id);
    }

    @PutMapping("/users/{id}/status/{status}")
    public Map<String, Object> updateUserStatus(@PathVariable String id, @PathVariable String status) {
        return adminService.updateUserStatus(id, status);
    }

    @DeleteMapping("/users/{id}")
    public Map<String, String> deleteUser(@PathVariable String id) {
        return adminService.deleteUser(id);
    }

    @GetMapping("/events")
    public List<Map<String, Object>> events() {
        return adminService.getAllEvents();
    }

    @GetMapping("/events/{id}")
    public Map<String, Object> getEvent(@PathVariable String id) {
        return adminService.getEventDetails(id);
    }

    @GetMapping("/bookings")
    public List<Map<String, Object>> bookings() {
        return adminService.getAllBookings();
    }

    @GetMapping("/bookings/{id}")
    public Map<String, Object> getBooking(@PathVariable String id) {
        return adminService.getBookingDetails(id);
    }

    @PutMapping("/bookings/{id}/status/{status}")
    public Map<String, Object> updateBookingStatus(@PathVariable String id, @PathVariable String status) {
        return adminService.updateBookingStatus(id, status);
    }

    @PutMapping("/bookings/{id}/admin-payment/complete")
    public Map<String, Object> completeBookingAdminPayment(@PathVariable String id) {
        return adminService.completeBookingAdminPayment(id);
    }

    @DeleteMapping("/bookings/{id}")
    public Map<String, String> deleteBooking(@PathVariable String id) {
        return adminService.deleteBooking(id);
    }

    @PutMapping("/events/{id}/status/{status}")
    public Map<String, Object> updateEventStatus(@PathVariable String id, @PathVariable String status) {
        return adminService.updateEventStatus(id, status);
    }

    @DeleteMapping("/events/{id}")
    public Map<String, String> deleteEvent(@PathVariable String id) {
        return adminService.deleteEvent(id);
    }
}
