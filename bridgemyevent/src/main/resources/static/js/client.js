// ================ Client Dashboard JS===============

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/join.html";
        return;
    }

    loadProfile();
    loadClientBookings();
    renderSavedLists();

    const saveBtn = document.getElementById("saveProfile");
    if (saveBtn) {
        saveBtn.addEventListener("click", updateProfile);
    }

    const bookingForm = document.getElementById("bookingForm");
    if (bookingForm) {
        bookingForm.addEventListener("submit", submitBooking);
    }

    bindPaymentModal();
    initFilters();
    initSupportedEvents();
});

let clientBookings = [];
let clientReviews = [];
const STORAGE_KEYS = {
    organizers: "savedOrganizers",
    events: "savedEvents"
};
let currentOrganizerProfile = null;
let pendingPayment = null;
let cachedEvents = [];
let currentExploreCategory = "All";
let currentBookingStatus = "All";

function getToken() {
    return localStorage.getItem("token");
}

async function loadProfile() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch("/client/profile", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load profile");

        // ✅ Check Account Status
        checkAccountStatus(data.status);

        document.getElementById("fullName")?.setAttribute("value", data.fullName || "");
        const fullNameInput = document.getElementById("fullName");
        if (fullNameInput) fullNameInput.value = data.fullName || "";
        const userNameInput = document.getElementById("userName");
        if (userNameInput) userNameInput.value = data.userName || "";
        const emailInput = document.getElementById("email");
        if (emailInput) emailInput.value = data.email || "";
        const phoneInput = document.getElementById("phone");
        if (phoneInput) phoneInput.value = data.phone || "";
        const cityInput = document.getElementById("city");
        if (cityInput) cityInput.value = data.city || "";
        const stateInput = document.getElementById("state");
        if (stateInput) stateInput.value = data.state || "";
        const aboutInput = document.getElementById("about");
        if (aboutInput) aboutInput.value = data.about || "";

        document.querySelectorAll(".cardUserName").forEach(el => el.textContent = data.userName || data.fullName || "Client");
        document.querySelectorAll(".cardFullName").forEach(el => el.textContent = data.fullName || "Client");
        document.querySelectorAll(".cardEmail").forEach(el => el.textContent = data.email || "");
        document.querySelectorAll(".cardLocation").forEach(el => el.textContent = [data.city, data.state].filter(Boolean).join(", "));

        if (data.profileImage) {
            document.getElementById("profileImage")?.setAttribute("src", data.profileImage);
            document.querySelectorAll(".profilePicture").forEach(img => img.src = data.profileImage);
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

function checkAccountStatus(status) {
    const overlay = document.getElementById("accountStatusOverlay");
    const title = document.getElementById("statusTitle");
    const message = document.getElementById("statusMessage");

    if (!overlay || !title || !message) return;

    const s = (status || "").toUpperCase();
    if (s === "SUSPENDED" || s === "DELETED") {
        overlay.style.display = "flex";
        if (s === "DELETED") {
            title.textContent = "Account Deleted";
            message.innerHTML = `Your account has been deleted by the administrator. <br><br><strong>Advice:</strong> If you believe this is a mistake, please contact our support team at support@bridgemyevent.com.`;
        } else if (s === "SUSPENDED") {
            title.textContent = "Account Suspended";
            message.innerHTML = `Your account has been temporarily suspended by the administrator. <br><br><strong>Advice:</strong> Please review our platform policies. You can contact support to appeal this suspension or wait for the suspension period to end.`;
        }
    } else {
        overlay.style.display = "none";
    }
}

async function updateProfile() {
    const token = getToken();
    if (!token) return;
    const payload = {
        fullName: document.getElementById("fullName")?.value || "",
        phone: document.getElementById("phone")?.value || "",
        city: document.getElementById("city")?.value || "",
        state: document.getElementById("state")?.value || "",
        about: document.getElementById("about")?.value || "",
        profileImage: document.getElementById("profileImage")?.src || ""
    };
    try {
        const res = await fetch("/client/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || "Failed to update profile");
        showToast("Profile updated successfully", "success", "bi-check-circle-fill");
        loadProfile();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

async function updatePassword() {
    const token = getToken();
    if (!token) return;
    const payload = {
        currentPassword: document.getElementById("currentPassword").value || "",
        newPassword: document.getElementById("newPassword").value || "",
        confirmPassword: document.getElementById("confirmPassword").value || ""
    };
    try {
        const res = await fetch("/client/profile/change-password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || "Failed to update password");
        showToast("Password updated successfully", "success", "bi-check-circle-fill");
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

async function handleProfilePicUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be under 5MB", "warning", "bi-exclamation-triangle-fill");
        return;
    }
    const token = getToken();
    if (!token) return;
    const formData = new FormData();
    formData.append("file", file);
    const statusEl = document.getElementById("uploadStatus");
    if (statusEl) statusEl.textContent = "Uploading...";
    try {
        const res = await fetch("/client/profile/upload-profile-pic", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Upload failed");
        if (data.imageUrl) {
            document.getElementById("profileImage")?.setAttribute("src", data.imageUrl);
            document.querySelectorAll(".profilePicture").forEach(img => img.src = data.imageUrl);
        }
        if (statusEl) statusEl.textContent = "Upload successful";
        showToast("Profile image updated", "success", "bi-check-circle-fill");
    } catch (err) {
        if (statusEl) statusEl.textContent = err.message;
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

async function loadAllEvents() {
    const token = getToken();
    if (!token) return;
    const errorEl = document.getElementById("profileErrorAtExplore");
    if (errorEl) errorEl.textContent = "";
    try {
        const res = await fetch("/client/profile/explore-organizers", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load events");
        cachedEvents = Array.isArray(data) ? data : [];
        populateCities();
        applyExploreFilters();
    } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
        console.error("Error loading events:", err);
    }
}

async function openSavedEventById(eventId) {
    const token = getToken();
    if (!token) return;
    navigateTo("explore");
    try {
        const res = await fetch("/client/profile/event-details", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load event");
        document.querySelector(".explore-card-wrap").style.display = "none";
        document.querySelector(".event-detail-wrap").style.display = "block";
        renderEventDetails(data);
        selectedEvent = data;
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

function generatePriceHTML(event) {
    if (!event) return "â€”";
    const priceType = (event.priceType || "").toLowerCase();
    if (priceType.includes("depends")) return "Depends on the setup";
    if (priceType.includes("price on request") || priceType.includes("on request")) return "Price on request";
    const amount = Number(event.priceAmount || 0);
    const unit = event.priceUnit ? `/${event.priceUnit}` : "";
    if (!Number.isFinite(amount) || amount <= 0) return "Price on request";
    return `₹${formatCurrency(amount)}<span>${unit}</span>`;
}

function getPaymentStage(booking) {
    const paymentStatus = normalizeStatus(booking.paymentStatus);
    if (paymentStatus === "PENDING_DEPOSIT") return "DEPOSIT";
    if (paymentStatus === "PENDING_FINAL") return "FINAL";
    return null;
}

function logout() {
    if (!confirm("Are you sure you want to log out?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/join.html";
}

async function loadClientBookings() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/client/profile/bookings", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load bookings");
        clientBookings = Array.isArray(data) ? data : [];
        renderClientBookings(clientBookings);
    } catch (err) {
        console.error("Error loading client bookings:", err);
    }
}

async function loadClientReviews() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/client/profile/reviews", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load reviews");
        clientReviews = Array.isArray(data) ? data : [];
        renderClientReviews(clientReviews);
        populateReviewEventSelect();
    } catch (err) {
        console.error("Error loading client reviews:", err);
    }
}

function renderClientReviews(reviews) {
    const container = document.getElementById("clientReviewsContainer");
    if (!container) return;
    if (!Array.isArray(reviews) || reviews.length === 0) {
        container.innerHTML = '<div class="no-data">You have not submitted any reviews yet.</div>';
        return;
    }
    container.innerHTML = reviews.map(review => {
        const eventName = review.eventName || review.eventId || "Event";
        const comment = review.comment || "";
        return `
            <div class="review-card">
              <div class="rev-top">
                <div style="flex:1">
                  <div class="rev-org-name">${escapeHtml(eventName)}</div>
                  <div class="rev-event">${escapeHtml(eventName)} · ${formatDate(review.createdAt)}</div>
                  <div class="rev-stars mt-1">${renderStars(review.rating)}</div>
                </div>
                <div class="rev-date">${formatDate(review.createdAt)}</div>
              </div>
              <p class="rev-text">${escapeHtml(comment)}</p>
            </div>
        `;
    }).join("");
}

function populateReviewEventSelect() {
    const select = document.getElementById("reviewEventSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Select an event to review</option>';

    const uniqueEvents = clientBookings.reduce((acc, booking) => {
        if (!booking.eventId) return acc;
        if (acc.some(item => item.eventId === booking.eventId)) return acc;
        acc.push({ eventId: booking.eventId, label: booking.venueName || booking.eventName || booking.eventId });
        return acc;
    }, []);

    if (uniqueEvents.length === 0) {
        select.innerHTML += '<option value="">No booked events available</option>';
        return;
    }

    select.innerHTML += uniqueEvents.map(ev => `
        <option value="${escapeHtml(ev.eventId)}">${escapeHtml(ev.label)}</option>
    `).join("");
}

async function submitClientReview() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const eventId = document.getElementById("reviewEventSelect")?.value;
    const rating = Number(document.getElementById("reviewRating")?.value);
    const comment = document.getElementById("reviewComment")?.value.trim();

    if (!eventId || !rating || !comment) {
        showToast("Please choose an event, rating, and comment before submitting.", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    try {
        const res = await fetch("/client/profile/reviews", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ eventId, rating, comment })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to submit review");
        showToast("Review submitted successfully!", "success", "bi-star-fill");
        document.getElementById("reviewComment").value = "";
        await loadClientReviews();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
        console.error("Error submitting review:", err);
    }
}

async function submitEventReview() {
    const token = getToken();
    if (!token) return;
    if (!selectedEvent?.id) {
        showToast("Unable to identify the event. Please refresh the page.", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    const rating = Number(document.getElementById("detailReviewRating")?.value);
    const comment = document.getElementById("detailReviewComment")?.value.trim();

    if (!rating || !comment) {
        showToast("Please provide a rating and comment before submitting.", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    try {
        const res = await fetch("/client/profile/reviews", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ eventId: selectedEvent.id, rating, comment })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || "Failed to submit review");
        showToast("Review submitted successfully!", "success", "bi-star-fill");
        document.getElementById("detailReviewComment").value = "";
        document.getElementById("detailReviewRating").value = "";
        await loadEventReviewSummary(selectedEvent.id);
        await loadEventReviews(selectedEvent.id);
        loadClientReviews();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
        console.error("Error submitting event review:", err);
    }
}

function populateOrganizerReviewEventSelect() {
    const select = document.getElementById("organizerReviewEventSelect");
    if (!select) return;
    select.innerHTML = '<option value="">Select a booked event</option>';
    if (!currentOrganizerProfile?.organizerId) {
        select.innerHTML = '<option value="">Select an organizer first</option>';
        return;
    }

    const uniqueEvents = clientBookings.reduce((acc, booking) => {
        if (!booking.eventId || booking.organizerId !== currentOrganizerProfile.organizerId) return acc;
        if (acc.some(item => item.eventId === booking.eventId)) return acc;
        acc.push({ eventId: booking.eventId, label: booking.venueName || booking.eventName || booking.eventId });
        return acc;
    }, []);

    if (uniqueEvents.length === 0) {
        select.innerHTML += '<option value="">No booked events with this organizer</option>';
        return;
    }

    select.innerHTML += uniqueEvents.map(ev => `
        <option value="${escapeHtml(ev.eventId)}">${escapeHtml(ev.label)}</option>
    `).join("");

    // If the organizer review form is opened from a specific organizer profile,
    // automatically select the first booked event for that organizer.
    select.value = uniqueEvents[0].eventId;
}

async function submitOrganizerReview() {
    const token = getToken();
    if (!token) return;
    if (!currentOrganizerProfile?.organizerId) {
        showToast("Unable to identify the organizer. Please refresh the page.", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    const eventId = document.getElementById("organizerReviewEventSelect")?.value;
    const rating = Number(document.getElementById("organizerReviewRating")?.value);
    const comment = document.getElementById("organizerReviewComment")?.value.trim();

    if (!eventId || !rating || !comment) {
        showToast("Please choose an event, rating, and comment before submitting.", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    try {
        const res = await fetch("/client/profile/reviews", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ eventId, rating, comment })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || data.error || "Failed to submit review");
        showToast("Review submitted successfully!", "success", "bi-star-fill");
        document.getElementById("organizerReviewComment").value = "";
        document.getElementById("organizerReviewRating").value = "";
        await loadClientReviews();
        if (currentOrganizerProfile?.organizerId) {
            await loadOrganizerReviewSummary(currentOrganizerProfile.organizerId);
            await loadOrganizerReviews(currentOrganizerProfile.organizerId);
        }
        if (selectedEvent?.id === eventId) {
            await loadEventReviewSummary(eventId);
            await loadEventReviews(eventId);
        }
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
        console.error("Error submitting organizer review:", err);
    }
}

async function loadOrganizerReviewSummary(organizerId) {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`/client/profile/organizer/${encodeURIComponent(organizerId)}/reviews/summary`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load organizer review summary");
        const avgRating = data.rating != null ? Number(data.rating).toFixed(1) : null;
        const reviewCount = data.reviewCount != null ? Number(data.reviewCount) : 0;

        document.getElementById("detailOrgReviewAvg").textContent = reviewCount > 0 ? avgRating : "-";
        document.getElementById("detailOrgReviewStars").innerHTML = reviewCount > 0 ? renderStars(data.rating) : "";
        document.getElementById("detailOrgReviewCountText").textContent = reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? '' : 's'}` : "No reviews yet";
        document.getElementById("detailOrgRating").textContent = reviewCount > 0 ? avgRating : "-";
        document.getElementById("detailOrgReviews").textContent = reviewCount;
    } catch (err) {
        console.error("Error loading organizer review summary:", err);
    }
}

async function loadOrganizerReviews(organizerId) {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`/client/profile/organizer/${encodeURIComponent(organizerId)}/reviews`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load organizer reviews");
        renderOrganizerReviewItems(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error("Error loading organizer reviews:", err);
    }
}

function renderOrganizerReviewItems(reviews) {
    const list = document.getElementById("detailOrganizerReviewsList");
    if (!list) return;
    if (!Array.isArray(reviews) || reviews.length === 0) {
        list.innerHTML = '<div class="no-data">No reviews available for this organizer yet.</div>';
        return;
    }

    list.innerHTML = reviews.map(review => `
        <div class="review-item">
          <div class="rev-top">
            <img src="https://i.pravatar.cc/80?img=53" class="rev-avatar" alt=""/>
            <div style="flex:1">
              <div class="rev-name">${escapeHtml(review.clientId || "Guest")}</div>
              <div class="rev-date">${escapeHtml(review.eventName || review.eventId || "Event")}</div>
              <div class="rev-stars mt-1">${renderStars(review.rating)}</div>
            </div>
            <div class="rev-meta"><span style="font-size:11.5px;color:var(--txt-l)">${formatDate(review.createdAt)}</span></div>
          </div>
          <p class="rev-body">${escapeHtml(review.comment || "")}</p>
        </div>
    `).join("");
}

function renderStars(rating) {
    const rounded = Math.min(5, Math.max(0, Math.round(rating || 0)));
    return Array.from({ length: 5 }, (_, index) =>
        `<i class="bi ${index < rounded ? "bi-star-fill s-on" : "bi-star"}"></i>`
    ).join("");
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function readSaved(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeSaved(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

function getOrganizerDisplayImage(organizer) {
    return organizer?.profileImage
        || organizer?.organizerProfileImage
        || organizer?.imageUrl
        || "./assets/default-pfp.png";
}

async function refreshSavedOrganizerImages() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const organizers = readSaved(STORAGE_KEYS.organizers);
    if (!organizers.length) return;

    let updated = false;

    await Promise.all(organizers.map(async (organizer) => {
        if (!organizer?.id) return;

        try {
            const res = await fetch(`/client/profile/organizer/${organizer.id}`, {
                headers: { "Authorization": "Bearer " + token }
            });
            if (!res.ok) return;

            const profile = await res.json();
            const latestImage = profile?.profileImage?.trim();
            if (!latestImage || latestImage === organizer.profileImage) return;

            organizer.profileImage = latestImage;
            organizer.companyName = profile.companyName || organizer.companyName;
            organizer.city = profile.city || organizer.city;
            updated = true;
        } catch (err) {
            console.debug("Unable to refresh saved organizer image", organizer.id, err);
        }
    }));

    if (updated) {
        writeSaved(STORAGE_KEYS.organizers, organizers);
    }
}

function saveOrganizerFromEvent(event) {
    const id = event.organizerId || event.companyName;
    if (!id) return;
    const organizers = readSaved(STORAGE_KEYS.organizers);
    const index = organizers.findIndex(o => o.id === id);
    const savedEntry = {
        id,
        companyName: event.companyName,
        city: event.city,
        venueType: event.venueType,
        profileImage: event.profileImage || event.organizerProfileImage || event.organizer?.profileImage || event.imageUrl || organizers[index]?.profileImage || ""
    };
    if (index >= 0) {
        organizers[index] = { ...organizers[index], ...savedEntry };
    } else {
        organizers.push(savedEntry);
    }
    writeSaved(STORAGE_KEYS.organizers, organizers);
}

function removeOrganizer(id) {
    const organizers = readSaved(STORAGE_KEYS.organizers).filter(o => o.id !== id);
    writeSaved(STORAGE_KEYS.organizers, organizers);
}

function saveEvent(event) {
    if (!event?.id) return;
    const events = readSaved(STORAGE_KEYS.events);
    const existingIndex = events.findIndex(e => e.id === event.id);
    if (existingIndex !== -1) {
        // If it exists but is missing the primary image field, update it
        if (!events[existingIndex].primaryImage) {
            events[existingIndex].primaryImage = getEventPrimaryImage(event);
            writeSaved(STORAGE_KEYS.events, events);
        }
        return;
    }
    events.push({
        id: event.id,
        organizerId: event.organizerId,
        companyName: event.companyName,
        venueName: event.venueName,
        venueType: event.venueType,
        city: event.city,
        priceType: event.priceType,
        priceAmount: event.priceAmount,
        priceUnit: event.priceUnit,
        maxCapacity: event.maxCapacity,
        primaryImage: getEventPrimaryImage(event)
    });
    writeSaved(STORAGE_KEYS.events, events);
}

function removeEvent(id) {
    const events = readSaved(STORAGE_KEYS.events).filter(e => e.id !== id);
    writeSaved(STORAGE_KEYS.events, events);
}

function isOrganizerSaved(event) {
    const id = event.organizerId || event.companyName;
    return readSaved(STORAGE_KEYS.organizers).some(o => o.id === id);
}

function isEventSaved(event) {
    return readSaved(STORAGE_KEYS.events).some(e => e.id === event.id);
}

function renderSavedLists() {
    renderSavedOrganizers();
    renderSavedEvents();
}

async function renderSavedOrganizers() {
    const container = document.getElementById("savedOrganizersGrid");
    if (!container) return;
    await refreshSavedOrganizerImages();
    const organizers = readSaved(STORAGE_KEYS.organizers);
    if (!organizers.length) {
        container.innerHTML = `<div style="font-size:12px;color:var(--txt-m)">No saved organizers yet.</div>`;
        return;
    }
    container.innerHTML = organizers.map(org => `
      <div class="org-card" data-org-id="${org.id}">
        <div class="org-card-img-wrap">
          <img src="${getOrganizerDisplayImage(org)}" class="org-card-img"/>
          <button class="org-fav-btn saved" data-org-id="${org.id}">
            <i class="bi bi-heart-fill"></i>
          </button>
        </div>
        <div class="org-body">
          <div class="org-name">${org.companyName || "Organizer"}</div>
          <div class="org-spec">${org.city || ""}</div>
          <div class="org-footer">
            <button class="btn-sky btn-sm" style="flex:1" onclick="navigateTo('explore')"><i class="bi bi-calendar-plus"></i>Book Now</button>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".org-fav-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeOrganizer(btn.dataset.orgId);
            renderSavedLists();
            showToast("Removed from saved organizers", "info", "bi-bookmark");
        });
    });

    container.querySelectorAll(".org-card").forEach(card => {
        card.addEventListener("click", () => {
            const organizerId = card.dataset.orgId;
            if (organizerId) viewOrganizerProfileById(organizerId);
        });
    });
}

function renderSavedEvents() {
    const container = document.getElementById("savedEventsGrid");
    if (!container) return;
    const events = readSaved(STORAGE_KEYS.events);
    if (!events.length) {
        container.innerHTML = `<div style="font-size:12px;color:var(--txt-m)">No saved events yet.</div>`;
        return;
    }
    container.innerHTML = events.map(ev => `
      <div class="event-card" data-event-id="${ev.id}">
        <div class="event-img-wrap">
          <img src="${getEventPrimaryImage(ev)}" class="event-img" alt="${ev.venueName || 'Event image'}"/>
          <button class="org-fav-btn saved" data-event-id="${ev.id}">
            <i class="bi bi-bookmark-heart-fill"></i>
          </button>
        </div>
        <div class="event-body">
          <div class="event-title">${ev.venueName || "Event"}</div>
          <div class="ev-meta-item"><i class="bi bi-geo-alt"></i>${ev.city || ""}</div>
          <div class="event-meta">
            <div class="ev-meta-item"><i class="bi bi-people"></i>Up to ${ev.maxCapacity || 0}</div>
          </div>
          <div class="ev-meta-item myEvCardVenTy"><i class="bi bi-flower2"></i>${ev.venueType || ""}</div>
          <div class="event-footer">
            <div class="event-price">${generatePriceHTML(ev)}</div>
          </div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".org-fav-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeEvent(btn.dataset.eventId);
            renderSavedLists();
            showToast("Removed from saved events", "info", "bi-bookmark");
        });
    });

    container.querySelectorAll(".event-card").forEach(card => {
        card.addEventListener("click", () => {
            const eventId = card.dataset.eventId;
            if (eventId) openSavedEventById(eventId);
        });
    });
}

function renderClientBookings(bookings) {
    const total = bookings.length;
    const pending = bookings.filter(b => ["REQUESTED", "PENDING_PAYMENT"].includes(normalizeStatus(b.status))).length;
    const confirmed = bookings.filter(b => ["CONFIRMED", "RUNNING"].includes(normalizeStatus(b.status))).length;

    const totalStat = document.getElementById("clientTotalBookingsStat");
    const upcomingStat = document.getElementById("clientUpcomingBookingsStat");
    const pendingStat = document.getElementById("clientPendingBookingsStat");
    const totalCount = document.getElementById("clientTotalBookingsCount");
    const confirmedCount = document.getElementById("clientConfirmedBookingsCount");
    const pendingCount = document.getElementById("clientPendingBookingsCount");

    if (totalStat) totalStat.textContent = total;
    if (totalCount) totalCount.textContent = total;
    if (confirmedCount) confirmedCount.textContent = confirmed;
    if (pendingCount) pendingCount.textContent = pending;
    if (pendingStat) pendingStat.textContent = pending;

    const upcoming = bookings
        .filter(b => isUpcomingBooking(b))
        .sort((a, b) => getBookingPrimaryDate(a) - getBookingPrimaryDate(b));

    if (upcomingStat) upcomingStat.textContent = upcoming.length;

    const upcomingBody = document.getElementById("clientUpcomingBookingsBody");
    if (upcomingBody) {
        upcomingBody.innerHTML = upcoming.slice(0, 5).map(b => renderClientUpcomingRow(b)).join("");
    }

    const bookingsBody = document.getElementById("clientBookingsBody");
    if (bookingsBody) {
        bookingsBody.innerHTML = bookings
            .sort((a, b) => getBookingPrimaryDate(b) - getBookingPrimaryDate(a))
            .map(b => renderClientBookingRow(b))
            .join("");
    }
}

function normalizeStatus(status) {
    return (status || "").trim().toUpperCase();
}

function getBookingPrimaryDate(booking) {
    const slots = Array.isArray(booking.dateAndTime) ? booking.dateAndTime : [];
    const dates = slots
        .map(s => parseBookingDateTime(s))
        .filter(d => d instanceof Date && !Number.isNaN(d.valueOf()));
    if (!dates.length) return new Date(0);
    return new Date(Math.min(...dates.map(d => d.valueOf())));
}

function parseBookingDateTime(slot) {
    if (!slot || !slot.date) return null;
    const time = slot.timeFrom || "00:00";
    return new Date(`${slot.date}T${time}`);
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.valueOf())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const d = new Date(`1970-01-01T${timeStr}`);
    if (Number.isNaN(d.valueOf())) return timeStr;
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function formatAmount(amount) {
    if (amount === null || amount === undefined || amount === "") return "—";
    const raw = String(amount);
    if (raw.toLowerCase().includes("request")) return "Price on request";
    const num = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(num)) return raw;
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(num)}`;
}

function statusBadge(status, refundStatus) {
    const normalized = normalizeStatus(status);
    if (normalized === "CONFIRMED") {
        return '<span class="bdg bdg-confirmed"><i class="bi bi-check-circle-fill"></i>Confirmed</span>';
    }
    if (normalized === "PENDING_PAYMENT") {
        return '<span class="bdg bdg-pending"><i class="bi bi-credit-card"></i>Pending Payment</span>';
    }
    if (normalized === "REQUESTED") {
        return '<span class="bdg bdg-pending"><i class="bi bi-hourglass-split"></i>Pending</span>';
    }
    if (normalized === "REJECTED") {
        return '<span class="bdg bdg-cancelled"><i class="bi bi-x-circle-fill"></i>Rejected</span>';
    }
    if (normalized === "CANCELLED") {
        let badge = '<span class="bdg bdg-cancelled"><i class="bi bi-x-circle-fill"></i>Cancelled</span>';
        if (refundStatus === "REFUNDED") {
            badge += '<br><span class="bdg bdg-confirmed" style="margin-top:4px; font-size:10px"><i class="bi bi-cash-stack"></i>Refunded</span>';
        } else if (refundStatus === "PENDING_REFUND") {
            badge += '<br><span class="bdg bdg-pending" style="margin-top:4px; font-size:10px"><i class="bi bi-hourglass-split"></i>Refund Pending</span>';
        }
        return badge;
    }
    if (normalized === "RUNNING") {
        return '<span class="bdg bdg-active"><i class="bi bi-lightning-fill"></i>Running</span>';
    }
    if (normalized === "COMPLETED") {
        return '<span class="bdg bdg-confirmed"><i class="bi bi-flag-fill"></i>Completed</span>';
    }
    return `<span class="bdg bdg-confirmed"><i class="bi bi-check-circle-fill"></i>${normalized || "Status"}</span>`;
}

function paymentStatusBadge(booking) {
    const status = normalizeStatus(booking.paymentStatus);
    if (status === "PAID") {
        return '<span class="bdg bdg-confirmed"><i class="bi bi-check-circle-fill"></i>Paid</span>';
    }
    if (status === "PENDING_FINAL") {
        return '<span class="bdg bdg-pending"><i class="bi bi-credit-card-2-front"></i>Remaining Due</span>';
    }
    if (status === "DEPOSIT_PAID") {
        return '<span class="bdg bdg-active"><i class="bi bi-check2-circle"></i>Deposit Paid</span>';
    }
    if (status === "PENDING_DEPOSIT") {
        return '<span class="bdg bdg-pending"><i class="bi bi-credit-card"></i>Deposit Due</span>';
    }
    if (status === "QUOTE_REQUIRED") {
        return '<span class="bdg bdg-pending"><i class="bi bi-info-circle"></i>Quote Required</span>';
    }
    if (status === "NOT_DUE") {
        return '<span class="bdg bdg-pending"><i class="bi bi-hourglass-split"></i>Awaiting Approval</span>';
    }
    return '<span class="bdg bdg-pending"><i class="bi bi-hourglass-split"></i>Pending</span>';
}

function isUpcomingBooking(booking) {
    const status = normalizeStatus(booking.status);
    if (status === "CANCELLED" || status === "REJECTED") return false;
    const primary = getBookingPrimaryDate(booking);
    return primary.valueOf() >= new Date().setHours(0, 0, 0, 0);
}

function getBookingOrganizerImage(booking) {
    if (!booking) return "./assets/default-pfp.png";
    const candidates = [
        booking.organizerProfileImage,
        booking.profileImage,
        booking.organizerImage,
        booking.organizer?.profileImage
    ];
    for (const img of candidates) {
        if (typeof img !== "string") continue;
        const trimmed = img.trim();
        if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") continue;
        return trimmed;
    }
    return "./assets/default-pfp.png";
}

function renderClientUpcomingRow(booking) {
    const slot = (booking.dateAndTime || [])[0] || {};
    const orgId = booking.organizerId || "";
    const orgImg = getBookingOrganizerImage(booking);
    return `
      <tr>
        <td>
          <div style="font-weight:700;font-size:13.5px;color:var(--txt-h)">${booking.venueName || "Venue"}</div>
          <div style="font-size:11.5px;color:var(--txt-m)">${capitalize(booking.eventType || "Event")} · ${booking.city || ""}</div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:8px" class="client-organizer-link" data-organizer-id="${orgId}">
            <img src="${orgImg}" class="tbl-avatar"/>
            <span style="font-size:13px;font-weight:600">${booking.companyName || "Organizer"}</span>
          </div>
        </td>
        <td>
          <div style="font-size:13px">${formatDate(slot.date)}</div>
          <div style="font-size:11px;color:var(--txt-m)">${formatTime(slot.timeFrom)}</div>
        </td>
        <td>${statusBadge(booking.status)}</td>
      </tr>
    `;
}

function renderClientBookingRow(booking) {
    const slot = (booking.dateAndTime || [])[0] || {};
    const stage = getPaymentStage(booking);
    const payBtn = stage
        ? `<button class="btn-sky btn-sm client-payment-action" data-booking-id="${booking.id}" data-stage="${stage}">${stage === "FINAL" ? "Pay Remaining" : "Pay 50%"}</button>`
        : "";
    const orgId = booking.organizerId || "";
    const orgImg = getBookingOrganizerImage(booking);
    return `
      <tr>
        <td>
          <div style="font-weight:700;font-size:13px;color:var(--txt-h)">${booking.venueName || "Venue"}</div>
          <div style="font-size:11px;color:var(--txt-m)">${capitalize(booking.eventType || "Event")} · ${booking.city || ""}</div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:7px" class="client-organizer-link" data-organizer-id="${orgId}">
            <img src="${orgImg}" class="tbl-avatar"/>
            <span style="font-size:12.5px;font-weight:600">${booking.companyName || "Organizer"}</span>
          </div>
        </td>
        <td style="font-size:12.5px">${formatDate(slot.date)}</td>
        <td style="font-weight:700;color:var(--txt-h)">${formatAmount(booking.totalAmount)}</td>
        <td>${paymentStatusBadge(booking)}</td>
        <td>${statusBadge(booking.status, booking.refundStatus)}</td>
        <td>
          <div class="booking-actions">
            ${payBtn}
            <button class="btn-ghost-sm btn-sm client-booking-view" data-booking-id="${booking.id}"><i class="bi bi-eye"></i>View</button>
            ${["REQUESTED", "CONFIRMED"].includes(normalizeStatus(booking.status)) 
                ? `<button class="btn-warn btn-sm client-booking-edit" data-booking-id="${booking.id}"><i class="bi bi-pencil-square"></i>Edit</button>` 
                : ""}
          </div>
        </td>
      </tr>
    `;
}

function getPaymentAmountByStage(booking, stage) {
    if (!booking) return null;
    if (stage === "DEPOSIT") return booking.depositAmount;
    if (stage === "FINAL") return booking.finalAmount;
    return booking.totalAmountValue;
}

function getPaymentStageLabel(stage) {
    if (stage === "DEPOSIT") return "Advance payment (50%)";
    if (stage === "FINAL") return "Remaining payment (50%)";
    return "Payment";
}

function bindPaymentModal() {
    document.addEventListener("click", (e) => {
        const paymentBtn = e.target.closest(".client-payment-action");
        if (paymentBtn) {
            const booking = clientBookings.find(b => b.id === paymentBtn.dataset.bookingId);
            if (booking) openPaymentConfirmModal(booking, paymentBtn.dataset.stage);
        }

        const viewBtn = e.target.closest(".client-booking-view");
        if (viewBtn) {
            const booking = clientBookings.find(b => b.id === viewBtn.dataset.bookingId);
            if (booking) {
                openClientBookingDetails(booking);
            }
        }

        const editBtn = e.target.closest(".client-booking-edit");
        if (editBtn) {
            const booking = clientBookings.find(b => b.id === editBtn.dataset.bookingId);
            if (booking) {
                openEditBookingModal(booking);
            }
        }
    });

    document.getElementById("paymentConfirmClose")?.addEventListener("click", closePaymentConfirmModal);
    document.getElementById("paymentConfirmCancel")?.addEventListener("click", closePaymentConfirmModal);
    document.getElementById("paymentConfirmModal")?.addEventListener("click", (e) => {
        if (e.target?.id === "paymentConfirmModal") closePaymentConfirmModal();
    });
    document.getElementById("paymentConfirmPay")?.addEventListener("click", confirmClientPayment);
    document.getElementById("clientBookingDetailClose")?.addEventListener("click", closeClientBookingDetails);
}

function openPaymentConfirmModal(booking, stage) {
    pendingPayment = { bookingId: booking.id, stage };
    document.getElementById("paymentConfirmEvent").textContent = booking.venueName || "Event";
    document.getElementById("paymentConfirmAmount").textContent = formatAmount(getPaymentAmountByStage(booking, stage));
    document.getElementById("paymentConfirmStage").textContent = getPaymentStageLabel(stage);
    document.getElementById("paymentConfirmModal")?.classList.add("show");
}

function closePaymentConfirmModal() {
    pendingPayment = null;
    document.getElementById("paymentConfirmModal")?.classList.remove("show");
}

let currentEditBookingId = null;

function openEditBookingModal(booking) {
    currentEditBookingId = booking.id;
    document.getElementById("editBookingGuests").value = booking.guests;
    document.getElementById("editBookingSetup").value = booking.setup;
    document.getElementById("editBookingMessage").value = "";
    
    const container = document.getElementById("editBookingDatesContainer");
    container.innerHTML = "";
    (booking.dateAndTime || []).forEach(slot => {
        addEditBookingDate(slot.date, slot.timeFrom, slot.timeTo);
    });
    
    if ((booking.dateAndTime || []).length === 0) {
        addEditBookingDate();
    }
    
    document.getElementById("editBookingModal").classList.add("show");
}

function closeEditBookingModal() {
    currentEditBookingId = null;
    document.getElementById("editBookingModal").classList.remove("show");
}

function addEditBookingDate(date = "", from = "", to = "") {
    const container = document.getElementById("editBookingDatesContainer");
    const div = document.createElement("div");
    div.className = "row g-2 mb-2 edit-booking-date-row";
    div.innerHTML = `
        <div class="col-4"><input type="date" class="fld edit-date" value="${date}"></div>
        <div class="col-3"><input type="time" class="fld edit-from" value="${from}"></div>
        <div class="col-3"><input type="time" class="fld edit-to" value="${to}"></div>
        <div class="col-2"><button class="btn-ghost-sm w-100" onclick="this.parentElement.parentElement.remove()"><i class="bi bi-trash"></i></button></div>
    `;
    container.appendChild(div);
}

async function submitBookingChangeRequest() {
    if (!currentEditBookingId) return;
    
    const guests = parseInt(document.getElementById("editBookingGuests").value);
    const setup = document.getElementById("editBookingSetup").value;
    const message = document.getElementById("editBookingMessage").value;
    
    const dateRows = document.querySelectorAll(".edit-booking-date-row");
    const dateAndTime = Array.from(dateRows).map(row => ({
        date: row.querySelector(".edit-date").value,
        timeFrom: row.querySelector(".edit-from").value,
        timeTo: row.querySelector(".edit-to").value
    })).filter(d => d.date && d.timeFrom && d.timeTo);
    
    if (dateAndTime.length === 0) {
        showToast("Please add at least one date/time slot", "error");
        return;
    }
    
    const payload = { guests, setup, dateAndTime, message };
    const token = getToken();
    
    try {
        const res = await fetch(`/client/profile/bookings/${currentEditBookingId}/request-change`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("Failed to submit change request");
        
        showToast("Change request submitted successfully", "success");
        closeEditBookingModal();
        loadBookings();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function confirmClientPayment() {
    if (!pendingPayment?.bookingId || !pendingPayment?.stage) return;

    const token = getToken();
    const { bookingId, stage } = pendingPayment;
    try {
        const res = await fetch(`/client/profile/bookings/${bookingId}/payment/fake?stage=${encodeURIComponent(stage)}`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Payment failed");
        closePaymentConfirmModal();
        showToast(
            stage === "FINAL" ? "Remaining 50% paid successfully" : "First 50% paid successfully",
            "success",
            "bi-check-circle-fill"
        );
        await loadClientBookings();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

function buildClientPaymentSummary(booking) {
    const paymentStatus = normalizeStatus(booking.paymentStatus);
    const total = formatAmount(booking.totalAmountValue ?? booking.totalAmount);
    const deposit = formatAmount(booking.depositAmount);
    const finalAmount = formatAmount(booking.finalAmount);
    const paid = formatAmount(booking.paidAmount);

    if (paymentStatus === "QUOTE_REQUIRED") return "Price is still pending from the organizer.";
    if (paymentStatus === "PENDING_DEPOSIT") return `Advance due: ${deposit}. Remaining after that: ${finalAmount}.`;
    if (paymentStatus === "DEPOSIT_PAID") return `Advance paid: ${deposit}. Remaining 50% will open once the event starts.`;
    if (paymentStatus === "PENDING_FINAL") return `Advance paid: ${deposit}. Remaining due now: ${finalAmount}.`;
    if (paymentStatus === "PAID") return `Paid in full: ${total}.`;
    return `Total: ${total}. Paid so far: ${paid}.`;
}

function openClientBookingDetails(booking) {
    if (!booking) return;
    
    // Populate basic info
    document.getElementById("clientDetailVenue").textContent = booking.venueName || "Venue";
    document.getElementById("clientDetailCompany").textContent = booking.companyName || "Company";
    document.getElementById("clientDetailCity").textContent = [booking.city, booking.state].filter(Boolean).join(", ");
    
    // Status
    document.getElementById("clientDetailStatus").innerHTML = statusBadge(booking.status);
    
    // Guests count
    const guests = booking.guests || booking.numberOfGuests || "—";
    document.getElementById("clientDetailGuests").textContent = typeof guests === 'number' ? guests : guests;
    
    // Total amount
    document.getElementById("clientDetailAmount").textContent = formatAmount(booking.totalAmountValue ?? booking.totalAmount);
    
    // Dates and Times
    const datesContainer = document.getElementById("clientDetailDates");
    datesContainer.innerHTML = "";
    const slots = Array.isArray(booking.dateAndTime) ? booking.dateAndTime : [];
    if (slots.length) {
        slots.forEach(slot => {
            const dateStr = formatDate(slot.date);
            const timeStr = slot.timeFrom ? formatTime(slot.timeFrom) : "—";
            const timeEndStr = slot.timeTo ? ` - ${formatTime(slot.timeTo)}` : "";
            const dateEl = document.createElement("div");
            dateEl.style.fontSize = "13px";
            dateEl.innerHTML = `<strong>${dateStr}</strong><br><span style="color:var(--txt-m);font-size:12px">${timeStr}${timeEndStr}</span>`;
            datesContainer.appendChild(dateEl);
        });
    } else {
        datesContainer.innerHTML = "<div style=\"font-size:13px;color:var(--txt-m)\">—</div>";
    }
    
    // Setup requirements
    const setupEl = document.getElementById("clientDetailSetup");
    if (booking.setup) {
        setupEl.textContent = booking.setup;
    } else {
        setupEl.textContent = "—";
    }
    
    // Message/Notes
    const messageEl = document.getElementById("clientDetailMessage");
    if (booking.clientMessage || booking.message) {
        messageEl.textContent = booking.clientMessage || booking.message;
    } else {
        messageEl.textContent = "—";
    }
    
    // Payment Summary
    const paymentSummary = buildClientPaymentSummary(booking);
    document.getElementById("clientDetailPaymentSummary").textContent = paymentSummary;
    
    // Payment Timeline (if available)
    const paymentTimeline = document.getElementById("clientPaymentTimeline");
    paymentTimeline.innerHTML = "";
    if (booking.depositAmount || booking.finalAmount || booking.paidAmount) {
        let timeline = "<div style=\"font-size:12px;color:var(--txt-m);margin:8px 0\">";
        if (booking.depositAmount) timeline += `<div>Deposit: ${formatAmount(booking.depositAmount)}</div>`;
        if (booking.finalAmount) timeline += `<div>Final: ${formatAmount(booking.finalAmount)}</div>`;
        if (booking.paidAmount) timeline += `<div>Paid: ${formatAmount(booking.paidAmount)}</div>`;
        timeline += "</div>";
        paymentTimeline.innerHTML = timeline;
    }
    
    // Payment Status Badge
    const paymentActionsEl = document.getElementById("clientDetailPaymentActions");
    paymentActionsEl.innerHTML = `<div>${paymentStatusBadge(booking)}</div>`;
    
    // Action buttons
    const stage = getPaymentStage(booking);
    const actionsEl = document.getElementById("clientDetailActions");
    let actionButtons = "";
    
    if (stage) {
        const amount = getPaymentAmountByStage(booking, stage);
        const label = stage === "FINAL" ? "Pay Remaining" : "Pay 50%";
        actionButtons += `<button class="btn-sky btn-sm client-payment-action" data-booking-id="${booking.id}" data-stage="${stage}">${label}</button>`;
    }
    
    actionButtons += `<button class="btn-ghost-sm btn-sm" onclick="closeClientBookingDetails()"><i class="bi bi-x-lg"></i> Close</button>`;
    actionsEl.innerHTML = actionButtons;
    
    // Show the detail card
    const detailCard = document.getElementById("clientBookingDetailCard");
    if (detailCard) {
        detailCard.style.display = "block";
        detailCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    
    // Reattach payment button handlers
    bindPaymentModal();
}

function closeClientBookingDetails() {
    const detailCard = document.getElementById("clientBookingDetailCard");
    if (detailCard) {
        detailCard.style.display = "none";
    }
}

function formatProfileList(list) {
    if (!Array.isArray(list) || list.length === 0) return "—";
    return list.filter(Boolean).join(", ");
}

function updateOrganizerDetailSaveButton() {
    const btn = document.getElementById("organizerDetailSaveBtn");
    if (!btn || !currentOrganizerProfile) return;
    const isSaved = readSaved(STORAGE_KEYS.organizers).some(o => o.id === currentOrganizerProfile.organizerId);
    btn.innerHTML = isSaved
        ? '<i class="bi bi-bookmark-check-fill"></i> Saved'
        : '<i class="bi bi-bookmark-heart-fill"></i> Save Organizer';
}

function openOrganizerProfileModal(profile, organizerId) {
    currentOrganizerProfile = { ...profile, organizerId };
    document.getElementById("organizerProfileCompany").textContent = profile.companyName || "Organizer";
    document.getElementById("organizerProfileName").textContent = profile.fullName || "";
    document.getElementById("organizerProfileCity").textContent = [profile.city, profile.state].filter(Boolean).join(", ");
    document.getElementById("organizerProfileEmail").textContent = profile.email || "—";
    document.getElementById("organizerProfilePhone").textContent = profile.contactNumber || "—";
    document.getElementById("organizerProfileAbout").textContent = profile.about || profile.description || "—";
    const img = profile.profileImage || "./assets/default-pfp.png";
    document.getElementById("organizerProfileImg").src = img;

    updateOrganizerSaveButton();
    document.getElementById("organizerProfileModal")?.classList.add("show");
}

function closeOrganizerProfileModal() {
    currentOrganizerProfile = null;
    document.getElementById("organizerProfileModal")?.classList.remove("show");
}

function updateOrganizerSaveButton() {
    const btn = document.getElementById("organizerProfileSaveBtn");
    if (!btn || !currentOrganizerProfile) return;
    const isSaved = readSaved(STORAGE_KEYS.organizers).some(o => o.id === currentOrganizerProfile.organizerId);
    btn.innerHTML = isSaved
        ? '<i class="bi bi-bookmark-check-fill"></i> Saved'
        : '<i class="bi bi-bookmark-heart-fill"></i> Save Organizer';
}

function saveOrganizerFromProfile(profile) {
    if (!profile?.organizerId) return;
    const organizers = readSaved(STORAGE_KEYS.organizers);
    const index = organizers.findIndex(o => o.id === profile.organizerId);
    const savedEntry = {
        id: profile.organizerId,
        companyName: profile.companyName,
        city: profile.city,
        profileImage: profile.profileImage || organizers[index]?.profileImage || ""
    };
    if (index >= 0) {
        organizers[index] = { ...organizers[index], ...savedEntry };
    } else {
        organizers.push(savedEntry);
    }
    writeSaved(STORAGE_KEYS.organizers, organizers);
}

function syncSavedOrganizerProfile(profile) {
    if (!profile?.organizerId) return;
    const organizers = readSaved(STORAGE_KEYS.organizers);
    const index = organizers.findIndex(o => o.id === profile.organizerId);
    if (index < 0) return;
    organizers[index] = {
        ...organizers[index],
        companyName: profile.companyName || organizers[index].companyName,
        city: profile.city || organizers[index].city,
        profileImage: profile.profileImage || organizers[index].profileImage || ""
    };
    writeSaved(STORAGE_KEYS.organizers, organizers);
}

async function viewOrganizerProfileById(organizerId) {
    if (!organizerId) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/client/profile/organizer/${organizerId}`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load organizer profile");
        openOrganizerProfileDetail(data, organizerId);
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

document.getElementById("organizerProfileClose")?.addEventListener("click", closeOrganizerProfileModal);
document.getElementById("organizerProfileModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "organizerProfileModal") closeOrganizerProfileModal();
});
document.getElementById("organizerProfileSaveBtn")?.addEventListener("click", () => {
    if (!currentOrganizerProfile) return;
    const isSaved = readSaved(STORAGE_KEYS.organizers).some(o => o.id === currentOrganizerProfile.organizerId);
    if (isSaved) {
        removeOrganizer(currentOrganizerProfile.organizerId);
        showToast("Removed from saved organizers", "info", "bi-bookmark");
    } else {
        saveOrganizerFromProfile(currentOrganizerProfile);
        showToast("Added to saved organizers", "success", "bi-bookmark-heart-fill");
    }
    renderSavedLists();
    updateOrganizerSaveButton();
});
document.getElementById("organizerProfileBookBtn")?.addEventListener("click", () => {
    closeOrganizerProfileModal();
    navigateTo("explore");
});

document.getElementById("organizerDetailSaveBtn")?.addEventListener("click", () => {
    if (!currentOrganizerProfile) return;
    const isSaved = readSaved(STORAGE_KEYS.organizers).some(o => o.id === currentOrganizerProfile.organizerId);
    if (isSaved) {
        removeOrganizer(currentOrganizerProfile.organizerId);
        showToast("Removed from saved organizers", "info", "bi-bookmark");
    } else {
        saveOrganizerFromProfile(currentOrganizerProfile);
        showToast("Added to saved organizers", "success", "bi-bookmark-heart-fill");
    }
    renderSavedLists();
    updateOrganizerDetailSaveButton();
});

document.getElementById("organizerDetailBookBtn")?.addEventListener("click", () => {
    closeOrganizerProfileDetail();
    navigateTo("explore");
});

document.addEventListener("click", (e) => {
    const organizerLink = e.target.closest(".client-organizer-link, .event-organizer-link");
    if (organizerLink) {
        const organizerId = organizerLink.dataset.organizerId;
        if (organizerId) viewOrganizerProfileById(organizerId);
    }
});

function getEventPrimaryImage(event) {
  if (!event) return "./assets/IMG-20251005-WA0004.jpg";
  if (Array.isArray(event.venueImages) && event.venueImages.length) return event.venueImages[0];
  if (event.primaryImage) return event.primaryImage;
  if (event.imageUrl) return event.imageUrl;

  const images = (event.setups || [])
    .flatMap(setup => Array.isArray(setup.images) ? setup.images.filter(Boolean) : [])
    .filter(Boolean);
  return images[0] || "./assets/IMG-20251005-WA0004.jpg";
}

function renderAllEvents(events) {
  const container = document.getElementById("myEventsContainer");
  if (!container) return;
  container.innerHTML = "";

  events.forEach(event => {
    const card = document.createElement("div");
    card.className = "event-card";
    card.dataset.eventId = event.id;
    const savedEvent = isEventSaved(event);
    const eventImage = getEventPrimaryImage(event);

    const adminBadge = (event.adminStatus === "FLAGGED") 
        ? `<div class="admin-badge badge-flagged"><i class="bi bi-flag-fill"></i>Flagged</div>` 
        : "";

    card.innerHTML = `
      <div class="event-img-wrap">
        ${adminBadge}
        <img src="${eventImage}" class="event-img" alt="${event.venueName || 'Event image'}"/>
      </div>
      <div class="event-body">
        <div class="event-title">${event.venueName}</div>
        <div class="ev-meta-item"><i class="bi bi-geo-alt"></i>${event.city}</div>
        <div class="event-meta">
          <div class="ev-meta-item"><i class="bi bi-people"></i>Up to ${event.maxCapacity}</div>
        </div>
        <div class="ev-meta-item myEvCardVenTy"><i class="bi bi-flower2"></i>${event.venueType}</div>
        <div class="event-footer">
          <div class="event-price">${generatePriceHTML(event)}</div>
          <div style="display: flex; gap:2px">
            <button class="btn-ghost-sm btn-sm" data-action="view-organizer" data-organizer-id="${event.organizerId || ""}">
              <i class="bi bi-person-badge"></i>
            </button>
            <button class="btn-ghost-sm btn-sm save-event-btn" data-action="save-event">
              <i class="bi ${savedEvent ? "bi-bookmark-heart-fill" : "bi-bookmark"}"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", async function (e) {
      if (e.target.closest('[data-action="view-organizer"]')) return;
      if (e.target.closest('[data-action="save-event"]')) return;

      const eventId = this.dataset.eventId;
      const token = localStorage.getItem("token");

      try {
        const res = await fetch("/client/profile/event-details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load event");
        document.querySelector(".explore-card-wrap").style.display = "none";
        document.querySelector(".event-detail-wrap").style.display = "block";
        renderEventDetails(data);
        selectedEvent = data;
      } catch (err) {
        console.error("Error fetching event details:", err);
      }
    });

    card.querySelector('[data-action="view-organizer"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (event.organizerId) viewOrganizerProfileById(event.organizerId);
    });

    card.querySelector('[data-action="save-event"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isEventSaved(event)) {
        removeEvent(event.id);
        showToast("Removed from saved events", "info", "bi-bookmark");
      } else {
        saveEvent(event);
        showToast("Saved event", "success", "bi-bookmark-heart-fill");
      }
      renderSavedLists();
      renderAllEvents(events);
    });

    container.appendChild(card);
  });
}
document.querySelector(".book-venue-btn").addEventListener("click", function(e){

  if(!selectedEvent){
    console.error("No event selected");
    return;
  }

  console.log("Booking Event:", selectedEvent.id);
  console.log("Selected Event for Booking:", selectedEvent);
  bookingCard(selectedEvent);

});


let selectedEvent = null;

function renderEventDetails(event) {

    // Basic Info
    document.querySelectorAll(".venueName").forEach(en => en.innerHTML = event.venueName) ;

    const allEventImages = [
        ...(Array.isArray(event.venueImages) ? event.venueImages.filter(Boolean) : []),
        ...(event.setups || [])
            .flatMap(setup => Array.isArray(setup.images) ? setup.images.filter(Boolean) : [])
    ].filter(Boolean);

    const defaultImages = [
        "./assets/IMG-20251005-WA0001.jpg",
        "./assets/IMG-20251005-WA0002.jpg",
        "./assets/IMG-20251005-WA0005.jpg"
    ];
    const displayImages = allEventImages.length > 0 ? allEventImages : defaultImages;

    const heroMainImg = document.querySelector(".hero-img-main img");
    const heroSubImgs = document.querySelectorAll(".hero-img-sub img");
    const morePhotosBtn = document.querySelector(".more-photos-btn");
    const heroGallery = document.querySelector(".hero-gallery");

    // Admin Badge in Detail
    const existingBadge = heroGallery.querySelector(".admin-badge");
    if (existingBadge) existingBadge.remove();
    if (event.adminStatus === "FLAGGED") {
        const badge = document.createElement("div");
        badge.className = "admin-badge badge-flagged";
        badge.style.top = "20px";
        badge.style.left = "20px";
        badge.innerHTML = `<i class="bi bi-flag-fill"></i>Flagged by Admin`;
        heroGallery.appendChild(badge);
    }

    if (heroMainImg) heroMainImg.src = displayImages[0];
    if (heroSubImgs[0]) heroSubImgs[0].src = displayImages[1] || displayImages[0];
    if (heroSubImgs[1]) heroSubImgs[1].src = displayImages[2] || displayImages[1] || displayImages[0];

    if (heroGallery) {
        let expandedRow = heroGallery.querySelector(".hero-gallery-expanded");
        if (!expandedRow) {
            expandedRow = document.createElement("div");
            expandedRow.className = "hero-gallery-expanded";
            expandedRow.style.display = "none";
            expandedRow.style.marginTop = "12px";
            expandedRow.innerHTML = `
                <div class="gallery-carousel position-relative rounded-4 shadow-sm overflow-hidden">

                <button type="button"
                    class="gallery-nav prev btn btn-dark btn-sm rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2">
                    <i class="bi bi-chevron-left"></i>
                </button>
            
                <img class="gallery-current w-100 d-block"
                     src=""
                     alt="Current image"
                     style="height:260px; object-fit:cover;" />
            
                <button type="button"
                    class="gallery-nav next btn btn-dark btn-sm rounded-circle position-absolute top-50 end-0 translate-middle-y me-2">
                    <i class="bi bi-chevron-right"></i>
                </button>
            
            </div>
            
            <div class="gallery-meta text-center mt-2">
                <span class="gallery-count small text-muted"></span>
            </div>
            
            <div class="gallery-thumbs d-flex gap-2 mt-2 overflow-auto pb-1">
            </div>
            `;
            heroGallery.appendChild(expandedRow);
        }

        const currentImage = expandedRow.querySelector(".gallery-current");
        const countLabel = expandedRow.querySelector(".gallery-count");
        const thumbRow = expandedRow.querySelector(".gallery-thumbs");
        const prevBtn = expandedRow.querySelector(".gallery-nav.prev");
        const nextBtn = expandedRow.querySelector(".gallery-nav.next");
        let currentIndex = 0;

        const updateCarousel = index => {
            currentIndex = (index + displayImages.length) % displayImages.length;
            currentImage.src = displayImages[currentIndex];
            currentImage.alt = event.venueName ? `${event.venueName} photo ${currentIndex + 1}` : `Event photo ${currentIndex + 1}`;
            if (countLabel) countLabel.textContent = `${currentIndex + 1} of ${displayImages.length}`;
            thumbRow.querySelectorAll(".gallery-thumb").forEach((thumb, thumbIndex) => {
                thumb.classList.toggle("active", thumbIndex === currentIndex);
            });
        };

        const renderCarousel = () => {
            thumbRow.innerHTML = "";
            displayImages.forEach((url, index) => {
                const thumb = document.createElement("img");
                thumb.src = url;
                thumb.alt = event.venueName ? `${event.venueName} photo ${index + 1}` : `Event photo ${index + 1}`;
                thumb.className = "gallery-thumb";
                thumb.addEventListener("click", () => updateCarousel(index));
                thumbRow.appendChild(thumb);
            });
            updateCarousel(currentIndex);
        };

        prevBtn.onclick = () => updateCarousel(currentIndex - 1);
        nextBtn.onclick = () => updateCarousel(currentIndex + 1);

        if (displayImages.length > 1 && morePhotosBtn) {
            morePhotosBtn.style.display = "inline-flex";
            morePhotosBtn.dataset.imageCount = displayImages.length;
            morePhotosBtn.innerHTML = `<i class="bi bi-images"></i> See all ${displayImages.length}`;
            expandedRow.style.display = "none";
            morePhotosBtn.onclick = () => {
                const isHidden = expandedRow.style.display === "none";
                expandedRow.style.display = isHidden ? "block" : "none";
                morePhotosBtn.innerHTML = isHidden
                    ? `<i class="bi bi-images"></i> Hide images`
                    : `<i class="bi bi-images"></i> See all ${displayImages.length}`;
                if (isHidden) renderCarousel();
            };
        } else if (morePhotosBtn) {
            morePhotosBtn.style.display = "none";
            morePhotosBtn.onclick = null;
            morePhotosBtn.dataset.imageCount = "";
            expandedRow.style.display = "none";
        }
    }

    document.querySelector(".meta-item strong").textContent = event.city;

    document.querySelectorAll(".meta-item strong")[1].textContent = event.maxCapacity;

    // Description
    document.getElementById("detailDescription").textContent = event.description;

    document.querySelectorAll(".venueType").forEach(vt => vt.textContent = event.venueType);

    const companyNameEl = document.querySelector(".event-company-name");
    if (companyNameEl) {
      companyNameEl.textContent = event.companyName || "Organizer";
      companyNameEl.dataset.organizerId = event.organizerId || "";
      companyNameEl.classList.add("event-organizer-link");
    }
    const companyBox = document.querySelector(".event-company-name-box");
    if (companyBox) {
      companyBox.dataset.organizerId = event.organizerId || "";
      companyBox.classList.add("event-organizer-link");
    }

    // Pricing Logic
    let priceAmountEl = document.getElementById("detailPriceAmount");
    let pricePerEl = document.getElementById("detailPricePer");
    let priceAmountQe = document.querySelector(".detailPriceAmount");
    let pricePerElQe = document.querySelector(".detailPricePer");


    if (event.priceType === "Depends on the setup") {
        priceAmountEl.textContent = "Depends on the setup";
        pricePerEl.textContent = "";
        priceAmountQe.textContent = "Depends on the setup";
        pricePerElQe.textContent = "";
    }
    else if (event.priceType === "Price on request") {
        priceAmountEl.textContent = "Price on request";
        pricePerEl.textContent = "";
        priceAmountQe.textContent = "Price on request";
        pricePerElQe.textContent = "";
    }
    else {
        priceAmountEl.textContent = "₹" + event.priceAmount;
        pricePerEl.textContent = event.priceUnit;
        priceAmountQe.textContent = "₹" + event.priceAmount + " ";
        pricePerElQe.textContent = " /"+ event.priceUnit;
    }

    // Capacity
    document.querySelector(".guests-limit").innerHTML =
        `${event.minCapacity} – ${event.maxCapacity} guests`;

    // Location
    document.getElementById("detailFullAddress").innerHTML = event.location + ", " + event.city;

    // Contact
    document.getElementById("detailContact").textContent =
        event.contactNumber;

    // Supported Events
    const supportedContainer =
        document.getElementById("detailSupportedEvents");
    supportedContainer.innerHTML = "";

    event.supportedEvents.forEach(ev => {
        supportedContainer.innerHTML +=
            `<span class="amenity-chip">${ev}</span>`;
    });

    // Amenities
    const amenityContainer =
        document.getElementById("detailAmenities");
    amenityContainer.innerHTML = "";

    event.amenities.forEach(am => {
        amenityContainer.innerHTML +=
            `<span class="amenity-chip">${am}</span>`;
    });

    // Setups
    const setupList = document.querySelector(".setup-list");
    setupList.innerHTML = "";

    event.setups.forEach(setup => {

        function generateAvailabilityText(setup) {
          const availabilityText = setup.availability;
          if(availabilityText == "Available") {
            return "Available";
          } else if (availabilityText == "On Request") {
            return "On Request";
          } else{
            return "Not Available";
          }
        }
        

        function generatePriceText(setup) {
          const pricePer = setup.pricePer;
          const priceText = setup.priceConditions;
          const setupTag = document.querySelector(".setup-price-tag");
          if (setup.priceConditions === "included") {
            return "Included in base price";
          } else if (setup.priceConditions === "additional") {
              return setup.setupPrice ? '₹' + setup.setupPrice + " /" + pricePer + " -additional" : 'Price on request';
          } else {
              return "Price on request";
          }
        }


        const setupImage = Array.isArray(setup.images) && setup.images.length > 0
            ? setup.images[0]
            : "./assets/IMG-20251005-WA0004.jpg";
        const hasMultipleSetupImages = Array.isArray(setup.images) && setup.images.length > 1;
        const setupGallery = hasMultipleSetupImages
            ? `<!-- Button -->
               <button class="btn btn-dark btn-sm mt-2" data-bs-toggle="collapse" data-bs-target="#setupGallery${setup._id}">
                   <i class="bi bi-images"></i> View Gallery (${setup.images.length})
               </button>
               
               <!-- Collapsible Gallery -->
               <div class="collapse mt-3" id="setupGallery${setup._id}">
                   
                   <div id="carousel${setup._id}" class="carousel slide" data-bs-ride="carousel">
                       
                       <!-- Indicators -->
                       <div class="carousel-indicators">
                           ${setup.images.map((_, i) => `
                               <button type="button" 
                                   data-bs-target="#carousel${setup._id}" 
                                   data-bs-slide-to="${i}" 
                                   class="${i === 0 ? 'active' : ''}">
                               </button>
                           `).join("")}
                       </div>
               
                       <!-- Images -->
                       <div class="carousel-inner rounded shadow-sm">
                           ${setup.images.map((url, i) => `
                               <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                   <img src="${url}" 
                                        class="d-block w-100 rounded" 
                                        style="height:300px; object-fit:cover;"
                                        alt="Image ${i+1}">
                               </div>
                           `).join("")}
                       </div>
               
                       <!-- Controls -->
                       <button class="carousel-control-prev" type="button" data-bs-target="#carousel${setup._id}" data-bs-slide="prev">
                           <span class="carousel-control-prev-icon"></span>
                       </button>
               
                       <button class="carousel-control-next" type="button" data-bs-target="#carousel${setup._id}" data-bs-slide="next">
                           <span class="carousel-control-next-icon"></span>
                       </button>
                   </div>
               
                   <!-- Image count -->
                   <div class="text-center mt-2 small text-muted">
                       1 / ${setup.images.length}
                   </div>
               
               </div>`
            : "";

        setupList.innerHTML += `
            <div class="setup-item-horizontal" style="display: flex;">
            <img class="setup-img"
                src="${setupImage}"
                alt="${setup.setupName || 'Setup image'}"/>
            <div class="setup-card-body">
              <div class="setup-top">
                <div>
                  <div class="setup-name">${setup.setupName}</div>
                </div>
                <div>
                  <span class="setup-price-tag">${generatePriceText(setup)}</span>
                </div>
              </div>
              <div class="setup-bottom">
                <span class="setup-avail avail-yes">
                  <i class="bi bi-check-circle-fill"></i> <div class="setup-avail-text">${generateAvailabilityText(setup)}</div>
                </span>
              </div>
              <div class="setup-desc">
                <span style="font-weight:600;color:var(--txt-h)">Description:</span>
                <div>${setup.setupDescription}</div>
              </div>
              ${setupGallery}
            </div>
          </div>
        `;
    });
    setupList.querySelectorAll(".setup-see-all-btn").forEach(btn => {
        const carousel = btn.nextElementSibling;
        if (!carousel) return;

        const imageUrls = JSON.parse(carousel.dataset.setupImages || "[]");
        const currentImg = carousel.querySelector(".setup-carousel-current");
        const indexLabel = carousel.querySelector(".setup-carousel-index");
        const thumbs = Array.from(carousel.querySelectorAll(".setup-thumb"));
        const prevBtn = carousel.querySelector(".setup-carousel-nav.prev");
        const nextBtn = carousel.querySelector(".setup-carousel-nav.next");
        let currentIndex = 0;

        const updateSetupCarousel = idx => {
            currentIndex = (idx + imageUrls.length) % imageUrls.length;
            currentImg.src = imageUrls[currentIndex];
            currentImg.alt = `${btn.textContent.replace(/\n/g, ' ').trim()} ${currentIndex + 1}`;
            if (indexLabel) indexLabel.textContent = `${currentIndex + 1}`;
            thumbs.forEach((thumb, thumbIndex) => {
                thumb.classList.toggle("active", thumbIndex === currentIndex);
            });
        };

        btn.addEventListener("click", () => {
            const isHidden = carousel.style.display === "none";
            carousel.style.display = isHidden ? "block" : "none";
            btn.innerHTML = isHidden
                ? `<i class="bi bi-images"></i> Hide images`
                : `<i class="bi bi-images"></i> See all ${imageUrls.length}`;
            if (isHidden) updateSetupCarousel(currentIndex);
        });

        prevBtn?.addEventListener("click", () => updateSetupCarousel(currentIndex - 1));
        nextBtn?.addEventListener("click", () => updateSetupCarousel(currentIndex + 1));
        thumbs.forEach((thumb, thumbIndex) => {
            thumb.addEventListener("click", () => updateSetupCarousel(thumbIndex));
        });
    });

    document.querySelector('.availabilityDataType').textContent = event.availabilityDataType;
    const chipsContainer = document.querySelector(".availability-data-chips");
    chipsContainer.innerHTML = "";

    event.availabilityData.forEach(ad => {
        chipsContainer.innerHTML += `
            <div class="amenity-chip availability-data-wrap">
              <i class="bi bi-calendar-event"></i>
              <span class="chip-date availability-date">${ad.date}</span>
              <span class="chip-time availability-time-from">${ad.timeFrom}</span>
              <span class="chip-time"> TO </span>
              <span class="chip-time availability-time-to">${ad.timeTo}</span>
            </div>`;
    });

    if (event.id) {
        loadEventReviewSummary(event.id);
        loadEventReviews(event.id);
    }
}

async function loadEventReviewSummary(eventId) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/client/profile/event/${encodeURIComponent(eventId)}/reviews/summary`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load event review summary");
        document.getElementById("detailEventRatingValue").textContent = data.rating != null ? Number(data.rating).toFixed(1) : "-";
        document.getElementById("detailEventRatingStars").innerHTML = renderStars(data.rating);
        document.getElementById("detailEventReviewCount").textContent = data.reviewCount != null ? `${data.reviewCount} reviews` : "- reviews";
    } catch (err) {
        console.error("Error loading event review summary:", err);
    }
}

async function loadEventReviews(eventId) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/client/profile/event/${encodeURIComponent(eventId)}/reviews`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load event reviews");
        renderEventReviewItems(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error("Error loading event reviews:", err);
    }
}

function renderEventReviewItems(reviews) {
    const list = document.getElementById("detailEventReviewsList");
    if (!list) return;
    if (!Array.isArray(reviews) || reviews.length === 0) {
        list.innerHTML = '<div class="no-data">No reviews available for this event yet.</div>';
        return;
    }
    list.innerHTML = reviews.map(review => `
        <div class="review-item">
          <div class="rev-top">
            <img src="https://i.pravatar.cc/80?img=53" class="rev-avatar" alt=""/>
            <div style="flex:1">
              <div class="rev-name">${escapeHtml(review.clientId || "Guest")}</div>
              <div class="rev-date">${escapeHtml(review.eventId || "Event")}</div>
              <div class="rev-stars mt-1">${renderStars(review.rating)}</div>
            </div>
            <div class="rev-meta"><span style="font-size:11.5px;color:var(--txt-l)">${formatDate(review.createdAt)}</span></div>
          </div>
          <p class="rev-body">${escapeHtml(review.comment || "")}</p>
        </div>
    `).join("");
}


function bookingCard(event) {
  const select = document.getElementById("decorationSelect");

  select.innerHTML = "";
  select.innerHTML = "<option value=\"\">Select a setup</option>";
  select.innerHTML += "<option value=\"no-decoration\">No Decoration</option>";

  if(!event.setups || event.setups.length === 0){
    select.innerHTML = "<option>No setup options</option>";
    updateBookingTotalAmount();
    return;
  }

  event.setups.forEach(setup => {

    const option = document.createElement("option");
    option.value = setup.setupName;
    option.textContent = setup.setupName;

    select.appendChild(option);

  });

  document.querySelector(".guestLimit").textContent = `(Limit: ${event.minCapacity} To ${event.maxCapacity})`;

  updateBookingTotalAmount();
}

function openBooking(){
  const eventDetailWrap = document.querySelector(".event-detail-wrap");
  const bookingCard = document.querySelector(".booking-card");
  if (!selectedEvent) {
    showToast('Please select a venue first','warning','bi-exclamation-triangle-fill');
    return;
  }
  eventDetailWrap.style.display = "none";
  bookingCard.style.display = "block";
  showToast('Redirecting to booking…','info','bi-calendar-plus')
}


// Handle adding another availability date
document.getElementById('bookingBtn').addEventListener('click', function() {
  const container = document.getElementById('bookingDatesContainer');
  const newRow = document.createElement('div');
  newRow.className = 'booking-data booking-row mb-3 p-3';
  newRow.style.cssText = 'background:var(--bg-subtle);border-radius:8px;border:1px solid var(--border)';
  
  newRow.innerHTML = `
    <div class="row g-2">
      <div class="col-md-4">
        <label class="fld-label">Date *</label>
        <input type="date" class="fld-input booking-date" />
      </div>
      <div class="col-md-3">
        <label class="fld-label">From Time *</label>
        <input type="time" class="fld-input booking-time-from" />
      </div>
      <div class="col-md-3">
        <label class="fld-label">To Time *</label>
        <input type="time" class="fld-input booking-time-to" />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="button" class="fld-input booking-remove-btn w-100" >
          <i class="bi bi-trash3"></i> Remove
        </button>
      </div>
    </div>
  `;
  
  container.appendChild(newRow);
  
  // Attach remove listener to new row
  newRow.querySelector('.booking-remove-btn').addEventListener('click', function() {
    newRow.remove();
    updateBookingTotalAmount();
  });

  updateBookingTotalAmount();
});

// Handle removing availability dates
document.addEventListener('click', function(e) {
  if (e.target.closest('.booking-remove-btn')) {
    e.target.closest('.booking-row').remove();
    updateBookingTotalAmount();
  }
});





function backToMyEvents(){
  const bookingCard = document.querySelector(".booking-card");
  const expandedRow = document.querySelector(".hero-gallery-expanded");
  const morePhotosBtn = document.querySelector(".more-photos-btn");
  document.querySelector(".event-detail-wrap").style.display = "none";
  document.querySelector(".explore-card-wrap").style.display = "block";
  bookingCard.style.display = "none";
  if (expandedRow) {
    expandedRow.style.display = "none";
  }
  if (morePhotosBtn) {
    const count = morePhotosBtn.dataset.imageCount || morePhotosBtn.textContent.match(/\d+/)?.[0] || "";
    morePhotosBtn.innerHTML = `<i class="bi bi-images"></i> See all ${count}`;
  }
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

document.getElementById("booking-request").addEventListener("click", function(e){
  e.preventDefault();
  submitBooking();
});

function getBookingRows() {
  return Array.from(document.querySelectorAll(".booking-row")).map(row => ({
    date: row.querySelector(".booking-date")?.value || "",
    timeFrom: row.querySelector(".booking-time-from")?.value || "",
    timeTo: row.querySelector(".booking-time-to")?.value || ""
  }));
}

function normalizeUnit(unit) {
  return (unit || "").toLowerCase().replace(/\s+/g, "-");
}

function normalizeText(text) {
  return (text || "").toLowerCase().trim();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getBookingQuantities(rows) {
  const uniqueDates = new Set();
  let totalMinutes = 0;

  rows.forEach(({ date, timeFrom, timeTo }) => {
    if (date) uniqueDates.add(date);
    if (timeFrom && timeTo) {
      const minutes = getMinutesDiff(timeFrom, timeTo);
      if (minutes > 0) totalMinutes += minutes;
    }
  });

  return {
    days: uniqueDates.size,
    hours: totalMinutes / 60
  };
}

function getMinutesDiff(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) return 0;
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return endMinutes > startMinutes ? endMinutes - startMinutes : 0;
}

function calcByUnit(amount, unit, quantities) {
  if (unit === "per-day") return amount * quantities.days;
  if (unit === "per-hour") return amount * quantities.hours;
  return amount;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount);
}

function calculateTotalAmount(event, decoration) {
  if (!event) {
    return { type: "amount", amount: 0, label: "0" };
  }

  const rows = getBookingRows();
  const quantities = getBookingQuantities(rows);

  const basePriceType = normalizeText(event.priceType);
  const baseUnit = normalizeUnit(event.priceUnit);
  const baseAmount = toNumber(event.priceAmount);

  let total = 0;
  let priceOnRequest = false;

  if (basePriceType === "price on request") {
    priceOnRequest = true;
  } else if (baseAmount > 0) {
    total += calcByUnit(baseAmount, baseUnit, quantities);
  }

  const selectedSetup = event.setups?.find(s => s.setupName === decoration);
  if (selectedSetup) {
    const setupCondition = normalizeText(selectedSetup.priceConditions);
    const setupUnit = normalizeUnit(selectedSetup.pricePer);
    const setupAmount = toNumber(selectedSetup.setupPrice);

    if (setupCondition === "additional") {
      if (setupAmount > 0) {
        total += calcByUnit(setupAmount, setupUnit, quantities);
      } else {
        priceOnRequest = true;
      }
    } else if (setupCondition === "request" || setupCondition === "price on request" || setupCondition === "on request") {
      priceOnRequest = true;
    }
  }

  if (priceOnRequest) {
    return { type: "request", amount: null, label: "Price on request" };
  }

  return { type: "amount", amount: total, label: formatCurrency(total) };
}

function updateBookingTotalAmount() {
  const totalAmountEl = document.getElementById("totalAmount");
  if (!totalAmountEl) return;

  const selectedSetup = document.getElementById("decorationSelect")?.value || "";
  const totalInfo = calculateTotalAmount(selectedEvent, selectedSetup);

  if (totalInfo.type === "request") {
    totalAmountEl.textContent = totalInfo.label;
  } else {
    totalAmountEl.textContent = `₹${totalInfo.label}`;
  }
}

async function submitBooking() {

  if (!selectedEvent) {
    showToast('Please select a venue first','warning','bi-exclamation-triangle-fill');
    return;
  }

  const token = localStorage.getItem("token");
  const eventType = document.getElementById("eventType").value.trim();
  const guestCount = parseInt(document.getElementById("guestCount").value, 10);
  const message = document.getElementById("bookingMessage").value.trim();

  const dateAndTime = Array.from(document.querySelectorAll(".booking-row")).map(row => {
    return {
      date: row.querySelector(".booking-date").value,
      timeFrom: row.querySelector(".booking-time-from").value,
      timeTo: row.querySelector(".booking-time-to").value
    };
  });

  const decoration = document.getElementById("decorationSelect").value;

  

  const totalInfo = calculateTotalAmount(selectedEvent, decoration);
  const totalAmount = totalInfo.type === "amount" ? String(totalInfo.amount) : totalInfo.label;

  const payload = {
    eventId: selectedEvent.id,
    eventType: eventType,
    guests: guestCount,
    dateAndTime: dateAndTime,
    setup: decoration,
    message: message,
    totalAmount: totalAmount
  };

  if (!eventType || !guestCount || dateAndTime.some(dt => !dt.date || !dt.timeFrom || !dt.timeTo)) {
    showToast('Please fill all required fields','warning','bi-exclamation-triangle-fill');
    return;
  }
  console.log("Booking Payload:", payload);

  try {
    validateBooking(selectedEvent, payload);
    console.log("Booking valid");
  } catch (err) {
    showToast(err.message,'error','bi-x-circle-fill');
    return;
  }

  try {
    const res = await fetch("/client/profile/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Booking failed");
    }

    showToast('Booking request sent','success','bi-check-circle-fill');
    loadClientBookings();
    document.getElementById("bookingForm").reset();
  } catch (err) {
    showToast(err.message,'error','bi-x-circle-fill');
  }
}

// Update total on input changes
document.getElementById("decorationSelect")?.addEventListener("change", updateBookingTotalAmount);
document.getElementById("bookingDatesContainer")?.addEventListener("input", function(e) {
  if (
    e.target.classList.contains("booking-date") ||
    e.target.classList.contains("booking-time-from") ||
    e.target.classList.contains("booking-time-to")
  ) {
    updateBookingTotalAmount();
  }
});

function validateBooking(event, booking) {

  if (booking.guests < event.minCapacity || booking.guests > event.maxCapacity) {
    throw new Error(
      `Guests must be between ${event.minCapacity} and ${event.maxCapacity}`
    );
  }

  const bookingSlots = booking.dateAndTime;
  const availability = event.availabilityData;

  bookingSlots.forEach(slot => {

    let matched = false;

    availability.forEach(a => {

      if (slot.date === a.date) {

        if (isTimeOverlap(
          slot.timeFrom,
          slot.timeTo,
          a.timeFrom,
          a.timeTo
        )) {
          matched = true;
        }

      }

    });

    // availability rule
    if (event.availabilityDataType === "Available On:") {

      if (!matched) {
        throw new Error(`Venue not available on ${slot.date} from ${slot.timeFrom} to ${slot.timeTo}`);
      }

    }

    if (event.availabilityDataType === "Unavailable On:") {

      if (matched) {
        throw new Error(`Venue unavailable on ${slot.date} from ${slot.timeFrom} to ${slot.timeTo}`);
      }

    }

  });

  return true;
}

function isTimeOverlap(start1, end1, start2, end2) {

  const s1 = new Date(`1970-01-01T${start1}`);
  const e1 = new Date(`1970-01-01T${end1}`);
  const s2 = new Date(`1970-01-01T${start2}`);
  const e2 = new Date(`1970-01-01T${end2}`);

  return s1 < e2 && s2 < e1;
}













/* ═══════ NAVIGATION ═══════ */
const pages  = document.querySelectorAll('.page');
const sbItems = document.querySelectorAll('.sb-item[data-page]');

const pageLabels = {
  'dashboard':    ['Dashboard',       'Welcome to your dashboard'],
  'explore':      ['Explore Venues',  'Discover top-rated event professionals near you'],
  'bookings':     ['My Bookings',     'All your event bookings in one place'],
  'saved':        ['Saved Venues',    'Your favorite and saved venues'],
  'messages':     ['Messages',        'Communicate with organizers'],
  'reviews':      ['My Reviews',      'Your feedback and ratings for events'],
  'profile':      ['Profile Settings','Update your personal information']
};

function navigateTo(id) {
  pages.forEach(p=>p.classList.remove('active'));
  sbItems.forEach(i=>i.classList.remove('active'));
  const pg = document.getElementById('page-'+id);
  if(pg) pg.classList.add('active');
  const lnk = document.querySelector(`.sb-item[data-page="${id}"]`);
  if(lnk) lnk.classList.add('active');
  if (id === "explore") loadAllEvents();
  if (id === "saved") renderSavedLists();
  if (id === "reviews") loadClientReviews();
  
  const titleData = pageLabels[id];
  if (titleData) {
    const titleEl = document.getElementById("topbarTitle");
    const subTitleEl = document.getElementById("topbarSubtitle");
    if (titleEl) titleEl.textContent = titleData[0];
    if (subTitleEl) subTitleEl.textContent = titleData[1];
  }

  if(window.innerWidth<=768) closeSidebar();
  window.scrollTo({top:0,behavior:'smooth'});
}

sbItems.forEach(i=>i.addEventListener('click',()=>navigateTo(i.dataset.page)));

/* ═══════ SKELETON LOADER ═══════ */
window.addEventListener('load',()=>{
  setTimeout(()=>{
    document.getElementById('skeletonLoader').style.display='none';
    document.getElementById('dashboardContent').style.display='block';
    document.getElementById('dashboardContent').style.animation='pgFadeUp .4s cubic-bezier(.4,0,.2,1) both';
    setTimeout(()=>showToast('Dashboard loaded successfully!','success','bi-check-circle-fill'), 200);
  }, 500);
});

/* ═══════ MOBILE SIDEBAR ═══════ */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sbOverlay');
function openSidebar(){sidebar.classList.add('open');overlay.classList.add('show');}
function closeSidebar(){sidebar.classList.remove('open');overlay.classList.remove('show');}
document.getElementById('hamBtn').addEventListener('click',()=>sidebar.classList.contains('open')?closeSidebar():openSidebar());
overlay.addEventListener('click',closeSidebar);

/* ═══════ DROPDOWNS ═══════ */
const qaBtn=document.getElementById('qaBtn');
const qaDd=document.getElementById('qaDd');
const avatarBtn=document.getElementById('avatarBtn');
const profileDd=document.getElementById('profileDd');

qaBtn?.addEventListener('click',e=>{e.stopPropagation();qaDd?.classList.toggle('show');profileDd?.classList.remove('show');});
avatarBtn?.addEventListener('click',e=>{e.stopPropagation();profileDd?.classList.toggle('show');qaDd?.classList.remove('show');});
document.addEventListener('click',()=>{qaDd?.classList.remove('show');profileDd?.classList.remove('show');});

/* Mark all read (removed as notifications are gone, kept for backward compatibility if needed) */
document.getElementById('markAllRead')?.addEventListener('click',e=>{
  e.stopPropagation();
  document.querySelectorAll('.nd-row.unread').forEach(r=>r.classList.remove('unread'));
  document.querySelectorAll('.nd-dot').forEach(d=>d.remove());
  document.querySelector('.tb-notif-dot')?.remove();
  showToast('All notifications marked as read','info','bi-check2-all');
});

/* ═══════ FILTER TABS ═══════ */
function setFtab(el){
  const bar = el.closest('.filter-row');
  bar.querySelectorAll('.ftab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

/* ═══════ FAV TOGGLE ═══════ */
function toggleFav(btn,e){
  e.stopPropagation();
  const saved = btn.classList.toggle('saved');
  btn.innerHTML = saved ? '<i class="bi bi-heart-fill"></i>' : '<i class="bi bi-heart"></i>';
  showToast(saved ? 'Added to saved organizers' : 'Removed from saved','info', saved?'bi-bookmark-heart-fill':'bi-bookmark');
}

/* ═══════ TOAST SYSTEM ═══════ */
function showToast(msg, type='info', icon='bi-info-circle'){
  const container = document.getElementById('toastContainer');
  const icons = {success:'bi-check-circle-fill',info:'bi-info-circle-fill',warning:'bi-exclamation-triangle-fill',error:'bi-x-circle-fill'};
  const ic = icon || icons[type];
  const toast = document.createElement('div');
  toast.className = `toast-v toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="bi ${ic}"></i></div>
    <div style="flex:1">${msg}</div>
    <button class="toast-close" onclick="removeToast(this.parentElement)"><i class="bi bi-x"></i></button>
    <div class="toast-progress"><div class="toast-progress-bar"></div></div>
  `;
  container.appendChild(toast);
  setTimeout(()=>removeToast(toast), 3500);
}
function removeToast(el){
  if(!el) return;
  el.classList.add('removing');
  setTimeout(()=>el.remove(), 250);
}

/* ═══════ MESSAGES ═══════ */
const threadData = [
  {img:'https://i.pravatar.cc/64?img=33',name:'PartyPro Events',status:'Online now',msgs:[
    {me:false,txt:"Hi Tushar! Thanks for enquiring about our birthday packages. I'd love to know more about what you have in mind.",t:'10:30 AM'},
    {me:true,txt:"Hi! I'm planning a birthday party for around 80 guests. Looking for a theme-based setup with DJ.",t:'10:34 AM'},
    {me:false,txt:"Great! We have 3 theme options. I'll send you the brochure. Also, DJ included in Premium package.",t:'10:38 AM'},
    {me:true,txt:"That sounds perfect! Can we also add a balloon arch at the entrance?",t:'10:40 AM'},
    {me:false,txt:"Sure! We can include a DJ and balloon arch for the birthday. I'll send you the updated quote shortly.",t:'10:42 AM'}
  ]},
  {img:'https://i.pravatar.cc/64?img=12',name:'Sunshine Weddings',status:'Last seen 2 hrs ago',msgs:[
    {me:false,txt:"Dear Tushar, your booking for the Garden Wedding Ceremony has been confirmed for March 22nd.",t:'Yesterday 3:00 PM'},
    {me:true,txt:"Thank you so much! Could you share the detailed itinerary?",t:'Yesterday 3:15 PM'},
    {me:false,txt:"Your booking has been confirmed. Please review the itinerary document I just sent to your email.",t:'Yesterday 3:20 PM'}
  ]},
  {img:'https://i.pravatar.cc/64?img=55',name:'EventCraft Co.',status:'Last seen yesterday',msgs:[
    {me:false,txt:"Good morning Tushar! We're all set for the Tech Summit Gala. Could you confirm the final guest headcount?",t:'Feb 14, 9:00 AM'},
    {me:true,txt:"We are ready for your corporate gala. Final headcount required.",t:'Feb 14, 9:30 AM'}
  ]},
  {img:'https://i.pravatar.cc/64?img=25',name:'Dream Décor Studio',status:'Last seen 3 days ago',msgs:[
    {me:false,txt:"Thank you for your interest! Our packages start from ₹60,000. Would you like a detailed brochure?",t:'Feb 10, 2:00 PM'}
  ]}
];

function selectThread(el, idx){
  document.querySelectorAll('.msg-thread').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  el.classList.remove('unread');
  const d = threadData[idx];
  document.getElementById('mvImg').src = d.img;
  document.getElementById('mvName').textContent = d.name;
  document.getElementById('mvStatus').textContent = d.status;
  const body = document.getElementById('mvBody');
  body.innerHTML = d.msgs.map(m=>`
    <div class="chat-group ${m.me?'me':'them'}">
      <div class="chat-bubble ${m.me?'me':'them'}">${m.txt}</div>
      <div class="chat-time">${m.t}</div>
    </div>
  `).join('');
  body.scrollTop = body.scrollHeight;
}

function sendMsg(){
  const input = document.getElementById('msgInput');
  const txt = input.value.trim();
  if(!txt) return;
  const body = document.getElementById('mvBody');
  const grp = document.createElement('div');
  grp.className='chat-group me';
  grp.innerHTML=`<div class="chat-bubble me">${txt}</div><div class="chat-time">Just now</div>`;
  body.appendChild(grp);
  body.scrollTop=body.scrollHeight;
  input.value='';
  setTimeout(()=>showToast('Message sent!','success','bi-send-fill'),300);
}
document.getElementById('msgInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});

/* ═══════ STAR PICKER ═══════ */
const starPicker = document.getElementById('starPicker');
if(starPicker){
  const stars = starPicker.querySelectorAll('i');
  let selected = 3;
  stars.forEach((s,i)=>{
    s.addEventListener('click',()=>{
      selected = i+1;
      stars.forEach((x,j)=>{
        x.className = j<selected ? 'bi bi-star-fill active' : 'bi bi-star';
      });
    });
    s.addEventListener('mouseenter',()=>{
      stars.forEach((x,j)=>{x.className=j<=i?'bi bi-star-fill active':'bi bi-star';});
    });
    s.addEventListener('mouseleave',()=>{
      stars.forEach((x,j)=>{x.className=j<selected?'bi bi-star-fill active':'bi bi-star';});
    });
  });
}

  option.textContent = ev;
  eventEl.appendChild(option);







function initSupportedEvents() {
    const supportedEvents = [
        'Corporate Meeting', 'Business Conference', 'Career Guidance Event', 'Press Conference',
        'Seminar', 'Networking Event', 'Business Pitch Session', 'Panel Discussion', 'Workshop',
        'Annual Business Review', 'Startup Demo Day', 'Corporate Training Session', 'Guest Lecture',
        'Student Development Session', 'Faculty Development Program (FDP)', 'Research Presentation',
        'Technical Talk', 'Academic Symposium', 'Orientation Program', 'Leadership Training',
        'Skill Development Event', 'Certification Session', 'Team-Building Session', 'Investor Meetup',
        'Soft Skills Workshop', 'Entrepreneurship Event', 'Digital Marketing Bootcamp', 'Brand Launch',
        'Trade Exhibit (Half-Day)', 'Product Launch', 'CSR Activity', 'Award Ceremony', 'Other'
    ];

    const eventEl = document.querySelector("#eventType");
    if (eventEl) {
        eventEl.innerHTML = '<option value="">Select Event Type</option>';
        supportedEvents.forEach(ev => {
            const option = document.createElement("option");
            option.value = ev;
            option.textContent = ev;
            eventEl.appendChild(option);
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function initFilters() {
    const exploreSearch = document.getElementById("exploreSearch");
    if (exploreSearch) {
        exploreSearch.addEventListener("input", debounce(applyExploreFilters, 300));
    }
    document.querySelector(".search-btn")?.addEventListener("click", applyExploreFilters);

    const bookingSearch = document.getElementById("bookingSearch");
    if (bookingSearch) {
        bookingSearch.addEventListener("input", debounce(applyBookingFilters, 300));
    }

    ["filterCity", "filterVenueType", "filterPrice", "filterDate", "exploreSort"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", applyExploreFilters);
    });

    document.querySelectorAll("#explore-tabs .ftab, .page#page-explore .filter-row .ftab").forEach(tab => {
        tab.addEventListener("click", () => {
            currentExploreCategory = tab.dataset.category || "All";
            document.querySelectorAll("#explore-tabs .ftab, .page#page-explore .filter-row .ftab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            applyExploreFilters();
        });
    });

    document.querySelectorAll("#booking-tabs .ftab, .page#page-bookings .filter-row .ftab").forEach(tab => {
        tab.addEventListener("click", () => {
            currentBookingStatus = tab.dataset.status || "All";
            document.querySelectorAll("#booking-tabs .ftab, .page#page-bookings .filter-row .ftab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            applyBookingFilters();
        });
    });
}

function populateCities() {
    const cities = [...new Set(cachedEvents.map(e => e.city).filter(Boolean))].sort();
    const citySelect = document.getElementById("filterCity");
    if (!citySelect) return;
    citySelect.innerHTML = '<option value="">All Cities</option>';
    cities.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
    });
}

function applyExploreFilters() {
    let filtered = [...cachedEvents];

    // Search Query
    const query = document.getElementById("exploreSearch")?.value.toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(e => 
            (e.venueName || "").toLowerCase().includes(query) ||
            (e.companyName || "").toLowerCase().includes(query) ||
            (e.fullName || "").toLowerCase().includes(query)
        );
    }

    // Category Tab
    if (currentExploreCategory !== "All") {
        filtered = filtered.filter(e => 
            ((e.venueType || "").toLowerCase() === currentExploreCategory.toLowerCase()) ||
            ((e.supportedEvents || []).some(se => se.toLowerCase() === currentExploreCategory.toLowerCase()))
        );
    }

    // City Filter
    const city = document.getElementById("filterCity")?.value;
    if (city) {
        filtered = filtered.filter(e => e.city === city);
    }

    // Venue Type Filter
    const vType = document.getElementById("filterVenueType")?.value;
    if (vType) {
        filtered = filtered.filter(e => e.venueType === vType);
    }

    // Price Filter
    const priceRange = document.getElementById("filterPrice")?.value;
    if (priceRange) {
        const parts = priceRange.split("-");
        if (priceRange === "500000+") {
            filtered = filtered.filter(e => Number(e.priceAmount || 0) >= 500000);
        } else {
            const min = Number(parts[0]);
            const max = Number(parts[1]);
            filtered = filtered.filter(e => {
                const price = Number(e.priceAmount || 0);
                return price >= min && price <= max;
            });
        }
    }

    // Date Filter (Availability)
    const date = document.getElementById("filterDate")?.value;
    if (date) {
        filtered = filtered.filter(e => {
            if (!e.availabilityData) return false;
            return e.availabilityData.some(a => a.date === date);
        });
    }

    // Sorting
    const sort = document.getElementById("exploreSort")?.value;
    if (sort === "price-low") {
        filtered.sort((a, b) => (a.priceAmount || 0) - (b.priceAmount || 0));
    } else if (sort === "price-high") {
        filtered.sort((a, b) => (b.priceAmount || 0) - (a.priceAmount || 0));
    } else if (sort === "rating" || sort === "popular") {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    renderAllEvents(filtered);
}

function applyBookingFilters() {
    let filtered = [...clientBookings];

    // Search Query
    const query = document.getElementById("bookingSearch")?.value.toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(b => 
            (b.venueName || "").toLowerCase().includes(query) ||
            (b.companyName || "").toLowerCase().includes(query)
        );
    }

    // Status Filter
    if (currentBookingStatus !== "All") {
        filtered = filtered.filter(b => normalizeStatus(b.status) === currentBookingStatus);
    }

    renderClientBookings(filtered);
}
