// Organizer Dashboard JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/join.html";
        return;
    }

    loadProfile();
    const savedPage = localStorage.getItem("currentOrganizerPage") || "dashboard";
    navigateTo(savedPage);

    const saveBtn = document.getElementById("saveProfile");
    if (saveBtn) {
        saveBtn.addEventListener("click", updateProfile);
    }
});

async function loadProfile() {
    try {
        const token = localStorage.getItem("token");
        const errorBox = document.getElementById("profileError") || { innerText: "" };

        const res = await fetch("/organizer/profile", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!res.ok) throw new Error("Session expired. Please login again.");

        const data = await res.json();
        
        // ✅ Check Account Status
        checkAccountStatus(data.status);

        document.getElementById("fullName").value = data.fullName || "Full Name";
        document.getElementById("companyName").value = data.companyName || "Company Name";
        document.getElementById("email").value = data.email || "Email";
        document.getElementById("contactNumber").value = data.contactNumber || "Contact Number";
        document.getElementById("experience").value = data.experience || "Experience";
        document.getElementById("gst").value = data.gst || "GST Number";
        document.getElementById("about").value = data.about || "About the company";
        document.getElementById("city").value = data.city || "City"; 
        document.getElementById("state").value = data.state || "State";
        document.getElementById("description").value = data.description || "Description";

        const container = document.getElementById("organizerLocations");
        const template = container.querySelector(".location-row");

        container.innerHTML = "";

        data.locations.forEach((loc, index) => {
            const clone = template.cloneNode(true);
            clone.querySelector("input").value = loc;

            const btn = clone.querySelector("button");
            btn.classList.remove("add-location", "remove-location");
            btn.classList.add(index === 0 ? "add-location" : "remove-location");
            btn.textContent = index === 0 ? "+" : "-";

            container.appendChild(clone);
        });

        document.querySelectorAll(".fullName").forEach(fn => fn.innerHTML = data.fullName || "Full Name");
        document.querySelectorAll(".companyName").forEach(cn => cn.innerHTML = data.companyName || "Company Name");
        document.querySelectorAll(".email").forEach(e => e.innerHTML = data.email || "Email");

        if (data.profileImage) {
            document.getElementById("profileImage").src = data.profileImage;
            document.querySelectorAll(".profilePicture").forEach(img => img.src = data.profileImage);
        }

        const averageRating = Number(data.rating || 0).toFixed(1);
        const avgRatingEl = document.getElementById("organizerAvgRating");
        const quickCountEl = document.getElementById("organizerReviewQuickCount");
        const subtitleEl = document.getElementById("organizerReviewSubtitle");
        const overallStarsEl = document.getElementById("organizerOverallStars");

        if (avgRatingEl) avgRatingEl.textContent = averageRating;
        if (quickCountEl) quickCountEl.textContent = `${data.reviewCount || 0} total reviews`;
        if (subtitleEl) subtitleEl.textContent = `Based on ${data.reviewCount || 0} reviews`;
        if (overallStarsEl) overallStarsEl.innerHTML = generateStarMarkup(Number(data.rating || 0));

        loadMyEvents();
        loadOrganizerBookings();

    } catch (error) {
        const errorBox = document.getElementById("profileError") || { innerText: "" };
        console.error("Error loading profile:", error);
        errorBox.innerText = error.message;
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

let organizerBookings = [];
let organizerMyEvents = [];
let currentClientProfile = null;
let pendingAdminPayment = null;
const eventNameById = new Map();
const clientNameById = new Map();
let organizerAnalyticsChart = null;
let organizerYearlyChart = null;
let organizerEarningsMonthlyChart = null;
let organizerEarningsYearlyChart = null;

async function loadOrganizerBookings() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/organizer/profile/bookings", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load bookings");
        organizerBookings = Array.isArray(data) ? data : [];
        renderOrganizerBookings(organizerBookings);
    } catch (err) {
        console.error("Error loading organizer bookings:", err);
    }
}

function generateStarMarkup(rating) {
    const rounded = Math.round((Number(rating) || 0) * 2) / 2;
    let html = "";
    for (let index = 1; index <= 5; index++) {
        if (rounded >= index) {
            html += '<i class="bi bi-star-fill star-on"></i>';
        } else if (rounded + 0.5 === index) {
            html += '<i class="bi bi-star-half star-on"></i>';
        } else {
            html += '<i class="bi bi-star star-off"></i>';
        }
    }
    return html;
}

function formatReviewDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}

async function loadOrganizerReviews() {
    const token = localStorage.getItem("token");
    const reviewList = document.getElementById("organizerReviewList");
    if (reviewList) reviewList.innerHTML = "<div class='no-items-message'>Loading reviews...</div>";

    try {
        const res = await fetch("/organizer/profile/reviews", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await readJsonSafe(res);
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load reviews");

        const reviews = Array.isArray(data) ? data : [];
        await hydrateReviewReferenceNames(reviews);
        renderOrganizerReviewCards(reviews);
        updateOrganizerReviewWidgets(reviews);

    } catch (err) {
        console.error("Error loading organizer reviews:", err);
        if (reviewList) reviewList.innerHTML = `<div class='no-items-message'>Could not load reviews.</div>`;
        updateOrganizerReviewWidgets([]);
    }
}

function updateOrganizerReviewWidgets(reviews) {
    const safeReviews = Array.isArray(reviews) ? reviews : [];
    const total = safeReviews.length;
    const totalRating = safeReviews.reduce((sum, review) => sum + (Number(review?.rating) || 0), 0);
    const average = total > 0 ? (totalRating / total) : 0;

    const subtitleEl = document.getElementById("organizerReviewSubtitle");
    const quickCountEl = document.getElementById("organizerReviewQuickCount");
    const avgRatingEl = document.getElementById("organizerAvgRating");
    const overallRatingEl = document.getElementById("organizerOverallRating");
    const overallStarsEl = document.getElementById("organizerOverallStars");
    const breakdownEl = document.getElementById("organizerReviewBreakdown");

    if (subtitleEl) subtitleEl.textContent = `Based on ${total} review${total === 1 ? "" : "s"}`;
    if (quickCountEl) quickCountEl.textContent = `${total} total reviews`;
    if (avgRatingEl) avgRatingEl.textContent = total > 0 ? average.toFixed(1) : "0.0";
    if (overallRatingEl) overallRatingEl.textContent = total > 0 ? average.toFixed(1) : "0.0";
    if (overallStarsEl) overallStarsEl.innerHTML = generateStarMarkup(average);

    if (!breakdownEl) return;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    safeReviews.forEach((review) => {
        const star = Math.round(Number(review?.rating) || 0);
        if (counts[star] != null) counts[star] += 1;
    });

    breakdownEl.innerHTML = [5, 4, 3, 2, 1].map((star) => {
        const count = counts[star];
        const width = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div class="rev-bar-row"><span class="lbl">${star} ★</span><div class="rev-bar-wrap"><div class="rev-bar" style="width:${width}%"></div></div><span class="cnt">${count}</span></div>`;
    }).join("");
}

function renderOrganizerReviewCards(reviews) {
    const container = document.getElementById("organizerReviewList");
    if (!container) return;
    if (!Array.isArray(reviews) || reviews.length === 0) {
        container.innerHTML = `<div class="no-items-message">No reviews found yet.</div>`;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const reviewerName = review.clientName || clientNameById.get(review.clientId) || review.clientId || "Client";
        const eventName = review.eventName || eventNameById.get(review.eventId) || review.eventId || "Event";
        const dateText = formatReviewDate(review.createdAt);
        return `
          <div class="review-card">
            <div class="review-top">
              <div style="flex:1">
                <div class="rev-name">${escapeHtml(reviewerName)}</div>
                <div class="rev-event">${escapeHtml(eventName)}</div>
                <div class="rev-stars mt-1">${generateStarMarkup(review.rating)}</div>
              </div>
              <div class="rev-date">${dateText}</div>
            </div>
            <div class="rev-body">${escapeHtml(review.comment || "")}</div>
          </div>`;
    }).join("");
}

async function fetchEventReviewSummary(eventId) {
    if (!eventId) return null;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/client/profile/event/${encodeURIComponent(eventId)}/reviews/summary`, {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) return null;
        return await readJsonSafe(res);
    } catch (err) {
        return null;
    }
}

async function attachEventReviewSummary(eventId, card) {
    if (!eventId || !card) return;
    const summary = await fetchEventReviewSummary(eventId);
    const valueNode = card.querySelector(".event-rating-value");
    const countNode = card.querySelector(".event-rating-count");
    if (!valueNode || !countNode) return;
    if (summary && summary.reviewCount > 0) {
        valueNode.textContent = Number(summary.rating).toFixed(1);
        countNode.textContent = `(${summary.reviewCount})`;
    } else {
        valueNode.textContent = "—";
        countNode.textContent = "No reviews";
    }
}

async function fetchEventReviews(eventId) {
    if (!eventId) return [];
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/client/profile/event/${encodeURIComponent(eventId)}/reviews`, {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) return [];
        const data = await readJsonSafe(res);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        return [];
    }
}

async function loadEventReviewData(eventId) {
    if (!eventId) return;
    const [summary, reviews] = await Promise.all([
        fetchEventReviewSummary(eventId),
        fetchEventReviews(eventId)
    ]);
    renderEventReviewSummary(summary, reviews);
    renderDetailEventReviews(reviews);
}

function renderEventReviewSummary(summary, reviews = []) {
    const ratingStars = document.getElementById("detailRatingStars");
    const ratingValue = document.getElementById("detailRatingValue");
    const reviewCount = document.getElementById("detailReviewCount");
    const panelRatingValue = document.getElementById("detailEventRatingValue");
    const panelRatingStars = document.getElementById("detailEventRatingStars");
    const panelReviewCount = document.getElementById("detailEventReviewCount");

    if (!ratingStars || !ratingValue || !reviewCount) return;

    const reviewsList = Array.isArray(reviews) ? reviews : [];
    const computedCount = reviewsList.length;
    const computedRating = computedCount > 0
        ? (reviewsList.reduce((sum, review) => sum + (Number(review?.rating) || 0), 0) / computedCount)
        : 0;

    const summaryCount = Number(summary?.reviewCount || 0);
    const count = summaryCount > 0 ? summaryCount : computedCount;
    const rating = count > 0 ? Number(summary?.rating ?? computedRating) : 0;
    const formatted = count > 0 ? Number(rating).toFixed(1) : "0.0";
    const total = count;

    const fallbackStars = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsList.forEach((review) => {
        const star = Math.round(Number(review?.rating) || 0);
        if (fallbackStars[star] != null) fallbackStars[star] += 1;
    });

    const summaryStarsTotal = Number(summary?.fiveStarCount || 0)
        + Number(summary?.fourStarCount || 0)
        + Number(summary?.threeStarCount || 0)
        + Number(summary?.twoStarCount || 0)
        + Number(summary?.oneStarCount || 0);

    const stars = {
        5: summaryStarsTotal > 0 ? Number(summary?.fiveStarCount || 0) : fallbackStars[5],
        4: summaryStarsTotal > 0 ? Number(summary?.fourStarCount || 0) : fallbackStars[4],
        3: summaryStarsTotal > 0 ? Number(summary?.threeStarCount || 0) : fallbackStars[3],
        2: summaryStarsTotal > 0 ? Number(summary?.twoStarCount || 0) : fallbackStars[2],
        1: summaryStarsTotal > 0 ? Number(summary?.oneStarCount || 0) : fallbackStars[1]
    };

    ratingStars.innerHTML = generateStarMarkup(formatted);
    ratingValue.textContent = formatted;
    reviewCount.textContent = `(${count} review${count === 1 ? "" : "s"})`;
    if (panelRatingValue) panelRatingValue.textContent = total > 0 ? formatted : "-";
    if (panelRatingStars) panelRatingStars.innerHTML = total > 0 ? generateStarMarkup(formatted) : generateStarMarkup(0);
    if (panelReviewCount) panelReviewCount.textContent = total > 0 ? `${total} review${total === 1 ? "" : "s"}` : "No reviews";

    [5, 4, 3, 2, 1].forEach((star) => {
        const countNode = document.getElementById(`detailEventBar${star}Count`);
        const fillNode = document.getElementById(`detailEventBar${star}Fill`);
        const starCount = stars[star] || 0;
        const percent = total > 0 ? Math.round((starCount / total) * 100) : 0;
        if (countNode) countNode.textContent = String(starCount);
        if (fillNode) fillNode.style.width = `${percent}%`;
    });
}

function renderDetailEventReviews(reviews) {
    const container = document.getElementById("detailEventReviewsList");
    if (!container) return;
    if (!Array.isArray(reviews) || reviews.length === 0) {
        container.innerHTML = `<div class="no-items-message">No reviews have been posted for this event yet.</div>`;
        return;
    }
    container.innerHTML = reviews.map(review => {
        const dateText = formatReviewDate(review.createdAt);
        const reviewerName = review.clientName || clientNameById.get(review.clientId) || review.clientId || "Client";
        const eventName = review.eventName || eventNameById.get(review.eventId) || review.eventId || "Event";
        return `
          <div class="review-card">
            <div class="review-top">
              <div style="flex:1">
                <div class="rev-name">${escapeHtml(reviewerName)}</div>
                <div class="rev-event">${escapeHtml(eventName)}</div>
                <div class="rev-stars mt-1">${generateStarMarkup(review.rating)}</div>
              </div>
              <div class="rev-date">${dateText}</div>
            </div>
            <div class="rev-body">${escapeHtml(review.comment || "")}</div>
          </div>`;
    }).join("");
}

async function hydrateReviewReferenceNames(reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) return;
    const token = localStorage.getItem("token");

    reviews.forEach((review) => {
        if (review?.clientId && review?.clientName) clientNameById.set(review.clientId, review.clientName);
        if (review?.eventId && review?.eventName) eventNameById.set(review.eventId, review.eventName);
    });

    const missingClientIds = [...new Set(
        reviews
            .map((review) => review?.clientId)
            .filter((clientId) => clientId && !clientNameById.has(clientId))
    )];

    if (missingClientIds.length === 0) return;

    await Promise.all(missingClientIds.map(async (clientId) => {
        try {
            const response = await fetch(`/organizer/profile/client/${encodeURIComponent(clientId)}`, {
                headers: { "Authorization": "Bearer " + token }
            });
            if (!response.ok) return;
            const profile = await readJsonSafe(response);
            const resolved = profile?.fullName || profile?.userName || profile?.email;
            if (resolved) clientNameById.set(clientId, resolved);
        } catch (error) {
            // Ignore per-client lookup failure, fallback text is used.
        }
    }));
}

async function readJsonSafe(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (error) {
        return {};
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatCurrency(value) {
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;
}

function openClientProfileModal(profile, clientId) {
    currentClientProfile = { ...profile, clientId };
    document.getElementById("clientProfileName").textContent = profile.fullName || "Client";
    document.getElementById("clientProfileCity").textContent = [profile.city, profile.state].filter(Boolean).join(", ");
    document.getElementById("clientProfileEmail").textContent = profile.email || "—";
    document.getElementById("clientProfilePhone").textContent = profile.phone || "—";
    document.getElementById("clientProfileAbout").textContent = profile.about || "—";
    const img = profile.profileImage || "./assets/default-pfp.png";
    document.getElementById("clientProfileImg").src = img;
    document.getElementById("clientProfileModal")?.classList.add("show");
}

function closeClientProfileModal() {
    currentClientProfile = null;
    document.getElementById("clientProfileModal")?.classList.remove("show");
}

async function viewClientProfileById(clientId) {
    if (!clientId) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/organizer/profile/client/${clientId}`, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load client profile");
        openClientProfileModal(data, clientId);
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

document.getElementById("clientProfileClose")?.addEventListener("click", closeClientProfileModal);
document.getElementById("clientProfileModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "clientProfileModal") closeClientProfileModal();
});

document.addEventListener("click", (e) => {
    const target = getEventElement(e);
    const link = target?.closest(".organizer-client-link");
    if (link) {
        const clientId = link.dataset.clientId;
        if (clientId) viewClientProfileById(clientId);
    }
});

function renderOrganizerBookings(bookings, updateStats = true) {
    if (updateStats) {
        const pending = bookings.filter(b => ["REQUESTED", "PENDING_PAYMENT"].includes(normalizeStatus(b.status))).length;
        const active = bookings.filter(b => ["CONFIRMED", "RUNNING"].includes(normalizeStatus(b.status))).length;

        const pendingStat = document.getElementById("organizerPendingBookingsStat");
        const activeStat = document.getElementById("organizerActiveBookingsStat");
        const pendingQuick = document.getElementById("organizerPendingQuick");

        if (pendingStat) pendingStat.textContent = pending;
        if (activeStat) activeStat.textContent = active;
        if (pendingQuick) pendingQuick.textContent = pending;
    }
    
    bookings.forEach((booking) => {
        if (booking?.clientId && booking?.clientName) clientNameById.set(booking.clientId, booking.clientName);
        if (booking?.eventId && booking?.venueName) eventNameById.set(booking.eventId, booking.venueName);
    });

    if (updateStats) {
        const recentBody = document.getElementById("organizerRecentBookingsBody");
        if (recentBody) {
            recentBody.innerHTML = bookings
                .slice()
                .sort((a, b) => getBookingPrimaryDate(b) - getBookingPrimaryDate(a))
                .slice(0, 6)
                .map(b => renderOrganizerBookingRow(b, true))
                .join("");
        }
    }

    const bookingsBody = document.getElementById("organizerBookingsBody");
    if (bookingsBody) {
        let listToRender = bookings.slice();
        if (updateStats) {
            listToRender.sort((a, b) => getBookingPrimaryDate(b) - getBookingPrimaryDate(a));
        }
        bookingsBody.innerHTML = listToRender
            .map(b => renderOrganizerBookingRow(b, false))
            .join("");
    }
}

let currentBookingsFilter = "All";

document.getElementById("bookingsSearch")?.addEventListener("input", filterOrganizerBookings);
document.getElementById("bookingsSpecificDate")?.addEventListener("change", filterOrganizerBookings);
document.getElementById("bookingsAdminFeeFilter")?.addEventListener("change", filterOrganizerBookings);

const bookingsFilterTabs = document.querySelectorAll("#bookingsFilterBar .filter-tab");
bookingsFilterTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
        bookingsFilterTabs.forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        currentBookingsFilter = e.target.dataset.filter || "All";
        filterOrganizerBookings();
    });
});

function filterOrganizerBookings() {
    const query = (document.getElementById("bookingsSearch")?.value || "").toLowerCase();
    const specificDate = document.getElementById("bookingsSpecificDate")?.value;
    const adminFeeStatus = document.getElementById("bookingsAdminFeeFilter")?.value || "ALL";
    
    let filtered = organizerBookings;
    
    if (query) {
        filtered = filtered.filter(b => {
            const client = (b.clientName || "").toLowerCase();
            const city = (b.city || "").toLowerCase();
            const event = (b.venueName || "").toLowerCase();
            
            const slot = (b.dateAndTime || [])[0] || {};
            const dateStr = formatDate(slot.date).toLowerCase();
            
            return client.includes(query) || city.includes(query) || event.includes(query) || dateStr.includes(query);
        });
    }
    
    if (currentBookingsFilter !== "All") {
        filtered = filtered.filter(b => {
            const status = normalizeStatus(b.status);
            if (currentBookingsFilter === "Pending") return ["REQUESTED", "PENDING_PAYMENT"].includes(status);
            if (currentBookingsFilter === "Confirmed") return status === "CONFIRMED" || status === "COMPLETED";
            if (currentBookingsFilter === "Rejected") return status === "REJECTED";
            if (currentBookingsFilter === "Cancelled") return status === "CANCELLED";
            if (currentBookingsFilter === "Running") return status === "RUNNING";
            return true;
        });
    }

    if (adminFeeStatus !== "ALL") {
        filtered = filtered.filter(b => (b.adminPaymentStatus || "").toUpperCase() === adminFeeStatus);
    }

    if (specificDate) {
        filtered = filtered.filter(b => {
            const slot = (b.dateAndTime || [])[0] || {};
            if (!slot.date) return false;
            try {
                const bDate = new Date(slot.date);
                const sDate = new Date(specificDate);
                if (!isNaN(bDate) && !isNaN(sDate)) {
                    return bDate.toISOString().split("T")[0] === sDate.toISOString().split("T")[0];
                }
            } catch(e){}
            return false;
        });
    }
    
    const sorted = filtered.slice().sort((a, b) => {
        return getBookingPrimaryDate(b) - getBookingPrimaryDate(a);
    });
    
    renderOrganizerBookings(sorted, false);
}

let rawOrganizerAnalytics = null;
let rawOrganizerEarnings = null;

document.getElementById("analyticsMonthYearFilter")?.addEventListener("change", (e) => {
    if (rawOrganizerAnalytics) renderAnalyticsGraphs(rawOrganizerAnalytics, e.target.value, document.getElementById("analyticsYearFilter")?.value);
});
document.getElementById("analyticsYearFilter")?.addEventListener("input", (e) => {
    if (rawOrganizerAnalytics) renderAnalyticsGraphs(rawOrganizerAnalytics, document.getElementById("analyticsMonthYearFilter")?.value, e.target.value);
});
document.getElementById("analyticsFilterClear")?.addEventListener("click", () => {
    const mInput = document.getElementById("analyticsMonthYearFilter");
    const yInput = document.getElementById("analyticsYearFilter");
    if (mInput) mInput.value = "";
    if (yInput) yInput.value = "";
    if (rawOrganizerAnalytics) renderAnalyticsGraphs(rawOrganizerAnalytics, "", "");
});

async function loadOrganizerAnalytics() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("/organizer/profile/analytics", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await readJsonSafe(response);
        if (!response.ok) throw new Error(data.message || data.error || "Failed to load analytics");

        rawOrganizerAnalytics = data;
        renderAnalyticsGraphs(data, document.getElementById("analyticsMonthYearFilter")?.value || "", document.getElementById("analyticsYearFilter")?.value || "");
    } catch (error) {
        showToast(error.message || "Failed to load analytics", "error", "bi-x-circle-fill");
    }
}

function renderAnalyticsGraphs(data, filterMonthYear = "", filterYear = "") {
    document.getElementById("organizerAnalyticsTotalEvents").textContent = data.totalEvents || 0;
    document.getElementById("organizerAnalyticsTotalBookings").textContent = data.totalBookings || 0;

    let monthly = data.monthlyTrend || [];
    let validBookings = data.validBookings || 0;
    
    if (filterMonthYear) {
        monthly = monthly.filter(m => m.monthKey === filterMonthYear);
        validBookings = monthly.reduce((sum, m) => sum + (m.count || 0), 0);
    } else if (filterYear) {
        monthly = monthly.filter(m => m.monthKey && m.monthKey.startsWith(filterYear));
        validBookings = monthly.reduce((sum, m) => sum + (m.count || 0), 0);
    }
    
    document.getElementById("organizerAnalyticsValidBookings").textContent = validBookings;

    renderSingleLineChart(
        "organizerMonthlyTrendChart",
        monthly,
        "label",
        "count",
        "Events"
    );
    renderSingleBarChart(
        "organizerYearlyTrendChart",
        data.yearlyTrend || [],
        "year",
        "count",
        "Events"
    );

    const body = document.getElementById("organizerTopEventsBody");
    if (body) {
        const rows = Array.isArray(data.eventFrequency) ? data.eventFrequency : [];
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--txt-m)">No event analytics found yet.</td></tr>';
        } else {
            body.innerHTML = rows.map(row => `
                <tr><td>${escapeHtml(row.eventName || "-")}</td><td>${row.count ?? 0}</td></tr>
            `).join("");
        }
    }
}

document.getElementById("earningsMonthYearFilter")?.addEventListener("change", (e) => {
    if (rawOrganizerEarnings) renderEarningsGraphs(rawOrganizerEarnings, e.target.value, document.getElementById("earningsYearFilter")?.value);
});
document.getElementById("earningsYearFilter")?.addEventListener("input", (e) => {
    if (rawOrganizerEarnings) renderEarningsGraphs(rawOrganizerEarnings, document.getElementById("earningsMonthYearFilter")?.value, e.target.value);
});
document.getElementById("earningsFilterClear")?.addEventListener("click", () => {
    const mInput = document.getElementById("earningsMonthYearFilter");
    const yInput = document.getElementById("earningsYearFilter");
    if (mInput) mInput.value = "";
    if (yInput) yInput.value = "";
    if (rawOrganizerEarnings) renderEarningsGraphs(rawOrganizerEarnings, "", "");
});

async function loadOrganizerEarnings() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch("/organizer/profile/earnings", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await readJsonSafe(response);
        if (!response.ok) throw new Error(data.message || data.error || "Failed to load earnings");

        rawOrganizerEarnings = data;
        renderEarningsGraphs(data, document.getElementById("earningsMonthYearFilter")?.value || "", document.getElementById("earningsYearFilter")?.value || "");
    } catch (error) {
        showToast(error.message || "Failed to load earnings", "error", "bi-x-circle-fill");
    }
}

function renderEarningsGraphs(data, filterMonthYear = "", filterYear = "") {
    let monthly = data.monthlySummary || [];
    let statements = data.statements || [];
    
    let rev = data.totalRevenue || 0;
    let adm = data.totalAdminFee || 0;
    let prof = data.totalProfit || 0;
    
    if (filterMonthYear) {
        monthly = monthly.filter(m => m.monthKey === filterMonthYear);
        statements = statements.filter(s => {
            if (!s.date || s.date === "-") return false;
            return s.date.startsWith(filterMonthYear);
        });
    } else if (filterYear) {
        monthly = monthly.filter(m => m.monthKey && m.monthKey.startsWith(filterYear));
        statements = statements.filter(s => {
            if (!s.date || s.date === "-") return false;
            return s.date.startsWith(filterYear);
        });
    }

    if (filterMonthYear || filterYear) {
        rev = monthly.reduce((sum, m) => sum + (m.revenue || 0), 0);
        adm = monthly.reduce((sum, m) => sum + (m.adminFee || 0), 0);
        prof = monthly.reduce((sum, m) => sum + (m.profit || 0), 0);
    }
    
    document.getElementById("organizerTotalRevenue").textContent = formatCurrency(rev);
    document.getElementById("organizerTotalAdminFee").textContent = formatCurrency(adm);
    document.getElementById("organizerTotalProfit").textContent = formatCurrency(prof);

    renderDualBarChart(
        "organizerEarningsMonthlyChart",
        monthly,
        "label",
        "revenue",
        "adminFee",
        "profit"
    );
    renderDualBarChart(
        "organizerEarningsYearlyChart",
        data.yearlySummary || [],
        "year",
        "revenue",
        "adminFee",
        "profit"
    );

    const body = document.getElementById("organizerEarningsStatementsBody");
    if (body) {
        if (!statements.length) {
            body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--txt-m)">No earnings statements available.</td></tr>';
        } else {
            body.innerHTML = statements.map(row => `
                <tr>
                  <td>${escapeHtml(row.date || "-")}</td>
                  <td>${escapeHtml(row.eventName || "-")}</td>
                  <td>${escapeHtml(row.clientName || "-")}</td>
                  <td>${formatCurrency(row.revenue || 0)}</td>
                  <td>${formatCurrency(row.adminFee || 0)}</td>
                  <td style="color:var(--green);font-weight:600">${formatCurrency(row.profit || 0)}</td>
                  <td>
                    <span class="status-badge" data-status="${row.adminPaymentStatus}">
                        ${(row.adminPaymentStatus || "PENDING_PAYMENT").replace(/_/g, " ")}
                    </span>
                    ${(row.adminPaymentStatus === "PENDING_PAYMENT") 
                        ? `<button class="btn-primary-v btn-sm ms-2" onclick="payAdminFee('${row.bookingId}')">Pay</button>` 
                        : ''}
                  </td>
                </tr>
            `).join("");
        }
    }
}

function renderSingleLineChart(canvasId, points, labelKey, valueKey, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const labels = points.map(point => String(point[labelKey] ?? "-"));
    const values = points.map(point => Number(point[valueKey] || 0));
    if (canvasId === "organizerMonthlyTrendChart" && organizerAnalyticsChart) organizerAnalyticsChart.destroy();
    organizerAnalyticsChart = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderColor: "#7C3AED",
                backgroundColor: "rgba(124,58,237,.18)",
                fill: true,
                tension: 0.35
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderSingleBarChart(canvasId, points, labelKey, valueKey, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const labels = points.map(point => String(point[labelKey] ?? "-"));
    const values = points.map(point => Number(point[valueKey] || 0));
    if (canvasId === "organizerYearlyTrendChart" && organizerYearlyChart) organizerYearlyChart.destroy();
    organizerYearlyChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                backgroundColor: "rgba(14,165,233,.7)",
                borderRadius: 8
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function renderDualBarChart(canvasId, points, labelKey, revenueKey, feeKey, profitKey) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const labels = points.map(point => String(point[labelKey] ?? "-"));
    const revenue = points.map(point => Number(point[revenueKey] || 0));
    const fee = points.map(point => Number(point[feeKey] || 0));
    const profit = points.map(point => Number(point[profitKey] || 0));

    if (canvasId === "organizerEarningsMonthlyChart" && organizerEarningsMonthlyChart) organizerEarningsMonthlyChart.destroy();
    if (canvasId === "organizerEarningsYearlyChart" && organizerEarningsYearlyChart) organizerEarningsYearlyChart.destroy();

    const chart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Revenue", data: revenue, backgroundColor: "rgba(5,150,105,.75)", borderRadius: 7 },
                { label: "Admin Fee", data: fee, backgroundColor: "rgba(217,119,6,.75)", borderRadius: 7 },
                { label: "Profit", data: profit, backgroundColor: "rgba(124,58,237,.75)", borderRadius: 7 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: { y: { beginAtZero: true } }
        }
    });

    if (canvasId === "organizerEarningsMonthlyChart") organizerEarningsMonthlyChart = chart;
    if (canvasId === "organizerEarningsYearlyChart") organizerEarningsYearlyChart = chart;
}

function normalizeStatus(status) {
    return (status || "").trim().toUpperCase();
}

function getEventElement(event) {
    let el = event.target;
    while (el && el.nodeType !== Node.ELEMENT_NODE) {
        el = el.parentNode;
    }
    return el;
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
        return '<span class="badge-v badge-confirmed"><i class="bi bi-check-circle-fill"></i> Paid</span>';
    }
    if (status === "PENDING_FINAL") {
        return '<span class="badge-v badge-pending"><i class="bi bi-credit-card-2-front"></i> Remaining Due</span>';
    }
    if (status === "DEPOSIT_PAID") {
        return '<span class="badge-v badge-active"><i class="bi bi-check2-circle"></i> Deposit Paid</span>';
    }
    if (status === "PENDING_DEPOSIT") {
        return '<span class="badge-v badge-pending"><i class="bi bi-credit-card"></i> Deposit Due</span>';
    }
    if (status === "QUOTE_REQUIRED") {
        return '<span class="badge-v badge-pending"><i class="bi bi-info-circle"></i> Quote Required</span>';
    }
    if (status === "NOT_DUE") {
        return '<span class="badge-v badge-pending"><i class="bi bi-hourglass-split"></i> Awaiting Approval</span>';
    }
    return '<span class="badge-v badge-pending"><i class="bi bi-hourglass-split"></i> Pending</span>';
}

function adminPaymentBadge(booking) {
    const status = normalizeStatus(booking.adminPaymentStatus);
    if (status === "PENDING_PAYMENT") {
        return '<span class="badge-v badge-pending"><i class="bi bi-credit-card"></i> Pay Admin</span>';
    }
    if (status === "AWAITING_CONFIRMATION") {
        return '<span class="badge-v badge-pending"><i class="bi bi-hourglass-split"></i> Awaiting Approval</span>';
    }
    if (status === "PAID") {
        return '<span class="badge-v badge-confirmed"><i class="bi bi-check-circle-fill"></i> Admin Paid</span>';
    }
    return '<span class="badge-v badge-open"><i class="bi bi-wallet2"></i> N/A</span>';
}

function renderOrganizerBookingRow(booking, isRecent) {
    const slot = (booking.dateAndTime || [])[0] || {};
    const actions = renderOrganizerActions(booking, isRecent);
    const clientImg = booking.clientProfileImage || "./assets/default-pfp.png";
    const clientId = booking.clientId || "";
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px" class="organizer-client-link" data-client-id="${clientId}">
            <img src="${clientImg}" class="tbl-avatar"/>
            <div>
              <div style="font-weight:600;font-size:13px">${booking.clientName || "Client"}</div>
              <div style="font-size:11px;color:var(--txt-m)">${booking.clientEmail || "—"}</div>
            </div>
          </div>
        </td>
        <td>${booking.venueName || "Event"}</td>
        <td>${formatDate(slot.date)}</td>
        <td>${booking.clientPhone || "—"}</td>
        <td>${paymentStatusBadge(booking)}</td>
        <td>${statusBadge(booking.status, booking.refundStatus)}</td>
        <td>${adminPaymentBadge(booking)}</td>
        ${!isRecent ? `<td>${actions}</td>` : ""} 
      </tr>
    `;
}

function renderOrganizerActions(booking, compact) {
    const status = normalizeStatus(booking.status);
    const viewBtn = `<button class="btn-ghost btn-sm organizer-booking-view" data-booking-id="${booking.id}"><i class="bi bi-eye"></i></button>`;
    const manageBtn = `<button class="btn-ghost btn-sm organizer-booking-manage" data-booking-id="${booking.id}"><i class="bi bi-gear-fill"></i></button>`;

    const needsPricing = booking && (booking.basePriceOnRequest === true || booking.setupPriceOnRequest === true ||
        booking.totalAmountValue === null || booking.totalAmountValue === undefined);
    if (status === "REQUESTED") {
        if (needsPricing) {
            return `
              <div class="booking-actions">
                <button class="btn-ghost btn-sm organizer-booking-view" data-booking-id="${booking.id}">
                  <i class="bi bi-pencil-square"></i> Pricing
                </button>
                ${manageBtn}
                ${viewBtn}
              </div>
            `;
        }
        return `
          <div class="booking-actions">
            <button class="btn-accept organizer-booking-action" data-booking-id="${booking.id}" data-status="PENDING_PAYMENT">Accept</button>
            <button class="btn-reject organizer-booking-action" data-booking-id="${booking.id}" data-status="REJECTED">Reject</button>
            <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
            ${manageBtn}
            ${viewBtn}
          </div>
        `;
    }
    if (status === "PENDING_PAYMENT") {
        return `
          <div class="booking-actions">
            <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
            ${manageBtn}
            ${viewBtn}
          </div>
        `;
    }
    if (status === "CONFIRMED") {
        return `
          <div class="booking-actions">
            <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="RUNNING">Mark Running</button>
            <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="COMPLETED">Mark Completed</button>
            <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
            ${manageBtn}
            ${viewBtn}
          </div>
        `;
    }
    if (status === "RUNNING") {
        return `
          <div class="booking-actions">
            <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="COMPLETED">Mark Completed</button>
            ${manageBtn}
            ${viewBtn}
          </div>
        `;
    }
    if (status === "COMPLETED") {
        const adminStatus = (booking.adminPaymentStatus || "").toUpperCase();
        if (adminStatus === "PENDING_PAYMENT") {
            return `
              <div class="booking-actions">
                <button class="btn-accept organizer-booking-pay-admin" data-booking-id="${booking.id}">Pay to Admin</button>
                ${manageBtn}
                ${viewBtn}
              </div>
            `;
        } else if (adminStatus === "AWAITING_CONFIRMATION") {
            return `
              <div class="booking-actions">
                <button class="btn-ghost btn-sm" disabled><i class="bi bi-hourglass-split"></i> Awaiting Admin</button>
                ${manageBtn}
                ${viewBtn}
              </div>
            `;
        }
    }
    return `<div class="booking-actions">${manageBtn} ${viewBtn}</div>`;
}

function showOrganizerBookingDetail(booking) {
    const detailCard = document.getElementById("organizerBookingDetailCard");
    if (!detailCard) return;

    const statusEl = document.getElementById("organizerDetailStatus");
    const venueEl = document.getElementById("organizerDetailVenue");
    const companyEl = document.getElementById("organizerDetailCompany");
    const cityEl = document.getElementById("organizerDetailCity");
    const guestsEl = document.getElementById("organizerDetailGuests");
    const amountEl = document.getElementById("organizerDetailAmount");
    const datesEl = document.getElementById("organizerDetailDates");
    const setupEl = document.getElementById("organizerDetailSetup");
    const messageEl = document.getElementById("organizerDetailMessage");
    const paymentSummaryEl = document.getElementById("organizerDetailPaymentSummary");
    const pricingEditor = document.getElementById("organizerPricingEditor");
    const baseInput = document.getElementById("organizerBasePrice");
    const setupInput = document.getElementById("organizerSetupPrice");
    const totalInput = document.getElementById("organizerTotalPrice");
    const savePricingBtn = document.getElementById("organizerSavePricing");
    const actionsEl = document.getElementById("organizerDetailActions");

    if (venueEl) venueEl.textContent = booking.venueName || "Venue";
    if (companyEl) companyEl.textContent = booking.companyName || "Organizer";
    if (cityEl) cityEl.textContent = booking.city || "";
    if (guestsEl) guestsEl.textContent = booking.guests ? `${booking.guests} guests` : "—";
    if (amountEl) amountEl.textContent = booking.totalAmount || "—";
    if (statusEl) statusEl.innerHTML = statusBadge(booking.status, booking.refundStatus);
    if (setupEl) setupEl.textContent = booking.setup || "No setup";
    if (messageEl) messageEl.textContent = booking.message || "—";
    if (paymentSummaryEl) paymentSummaryEl.textContent = buildPaymentSummary(booking);

    const paymentStatus = normalizeStatus(booking.paymentStatus);
    const baseRequest = booking.basePriceOnRequest === true;
    const setupRequest = booking.setupPriceOnRequest === true;
    const needsPricing = baseRequest || setupRequest || paymentStatus === "QUOTE_REQUIRED" || booking.totalAmountValue === null || booking.totalAmountValue === undefined;
    if (pricingEditor) {
        pricingEditor.style.display = needsPricing ? "block" : "none";
    }
    if (needsPricing) {
        const existingBase = booking.baseAmountValue || 0;
        const existingSetup = booking.setupAmountValue || 0;
        if (baseInput) {
            baseInput.value = booking.baseAmountValue || "";
            baseInput.disabled = !baseRequest && booking.baseAmountValue != null;
        }
        if (setupInput) {
            setupInput.value = booking.setupAmountValue || "";
            setupInput.disabled = !setupRequest && booking.setupAmountValue != null;
        }
        if (totalInput) totalInput.value = booking.totalAmountValue || "";

        const updateTotal = () => {
            const baseVal = baseInput && baseInput.disabled ? existingBase : (parseFloat(baseInput?.value || "0") || 0);
            const setupVal = setupInput && setupInput.disabled ? existingSetup : (parseFloat(setupInput?.value || "0") || 0);
            const total = baseVal + setupVal;
            if (totalInput) totalInput.value = total ? total.toFixed(2) : "";
        };
        if (baseInput) baseInput.oninput = updateTotal;
        if (setupInput) setupInput.oninput = updateTotal;
        if (savePricingBtn) savePricingBtn.onclick = () => saveBookingPricing(booking.id);
    }

    if (datesEl) {
        datesEl.innerHTML = "";
        (booking.dateAndTime || []).forEach(slot => {
            const chip = document.createElement("div");
            chip.className = "amenity-chip availability-data-wrap";
            chip.innerHTML = `<i class="bi bi-calendar-event"></i>
              <span class="chip-date">${formatDate(slot.date)}</span>
              <span class="chip-time">${formatTime(slot.timeFrom)}</span>
              <span class="chip-time"> TO </span>
              <span class="chip-time">${formatTime(slot.timeTo)}</span>`;
            datesEl.appendChild(chip);
        });
    }

    if (actionsEl) {
        actionsEl.innerHTML = "";
        const status = normalizeStatus(booking.status);
        if (status === "REQUESTED") {
            const needsPricing = booking && (booking.basePriceOnRequest === true || booking.setupPriceOnRequest === true ||
                booking.totalAmountValue === null || booking.totalAmountValue === undefined);
            if (needsPricing) {
                actionsEl.innerHTML = `
                  <button class="btn-ghost btn-sm organizer-booking-view" data-booking-id="${booking.id}">
                    <i class="bi bi-pencil-square"></i> Pricing
                  </button>
                  <button class="btn-reject organizer-booking-action" data-booking-id="${booking.id}" data-status="REJECTED">Reject</button>
                  <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
                `;
                return;
            }
            actionsEl.innerHTML = `
              <button class="btn-accept organizer-booking-action" data-booking-id="${booking.id}" data-status="PENDING_PAYMENT">Accept</button>
              <button class="btn-reject organizer-booking-action" data-booking-id="${booking.id}" data-status="REJECTED">Reject</button>
              <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
            `;
        } else if (status === "PENDING_PAYMENT") {
            actionsEl.innerHTML = `
              <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
            `;
        } else if (status === "CONFIRMED") {
            actionsEl.innerHTML = `
              <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="RUNNING">Mark Running</button>
              <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="COMPLETED">Mark Completed</button>
              <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="CANCELLED">Cancel</button>
            `;
        } else if (status === "RUNNING") {
            actionsEl.innerHTML = `
              <button class="btn-ghost btn-sm organizer-booking-action" data-booking-id="${booking.id}" data-status="COMPLETED">Mark Completed</button>
            `;
        } else if (status === "COMPLETED" && (booking.adminPaymentStatus || "").toUpperCase() === "PENDING_PAYMENT") {
            actionsEl.innerHTML = `
              <button class="btn-accept organizer-booking-pay-admin" data-booking-id="${booking.id}">Pay to Admin</button>
            `;
        }
    }

    detailCard.style.display = "block";
    detailCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", function(e) {
    const target = getEventElement(e);
    const viewBtn = target?.closest(".organizer-booking-view");
    if (viewBtn) {
        const bookingId = viewBtn.dataset.bookingId;
        const booking = organizerBookings.find(b => b.id === bookingId);
        if (booking) showOrganizerBookingDetail(booking);
    }
    const manageBtn = target?.closest(".organizer-booking-manage");
    if (manageBtn) {
        const bookingId = manageBtn.dataset.bookingId;
        const booking = organizerBookings.find(b => b.id === bookingId);
        if (booking) openManageBookingModal(booking);
    }

    const payAdminBtn = target?.closest(".organizer-booking-pay-admin");
    if (payAdminBtn) {
        const bookingId = payAdminBtn.dataset.bookingId;
        const booking = organizerBookings.find(b => b.id === bookingId);
        if (booking) {
            openAdminPaymentConfirmModal(booking);
        }
        return;
    }

    const actionBtn = target?.closest(".organizer-booking-action");
    if (actionBtn) {
        const bookingId = actionBtn.dataset.bookingId;
        const status = actionBtn.dataset.status;
        if (status === "PENDING_PAYMENT") {
            const booking = organizerBookings.find(b => b.id === bookingId);
            const needsPricing = booking && (booking.basePriceOnRequest === true || booking.setupPriceOnRequest === true ||
                booking.totalAmountValue === null || booking.totalAmountValue === undefined);
            if (needsPricing) {
                showToast("Set price for Price-on-request bookings before accepting.", "warning", "bi-exclamation-triangle-fill");
                if (booking) showOrganizerBookingDetail(booking);
                return;
            }
        }
        if (status === "CANCELLED" && !confirm("Cancel this booking?")) return;
        updateOrganizerBookingStatus(bookingId, status);
    }
});

let currentManageBookingId = null;

function openManageBookingModal(booking) {
    currentManageBookingId = booking.id;
    document.getElementById("manageBookingAdjustment").value = booking.priceAdjustment || 0;
    
    const pendingSection = document.getElementById("pendingClientChangesSection");
    const detailsEl = document.getElementById("pendingChangesDetails");
    if (booking.changeRequestStatus === "PENDING" && booking.requestedDetailsJson) {
        try {
            const changes = JSON.parse(booking.requestedDetailsJson);
            let html = `<ul>`;
            if (changes.guests) html += `<li><strong>Guests:</strong> ${changes.guests}</li>`;
            if (changes.setup) html += `<li><strong>Setup:</strong> ${changes.setup}</li>`;
            if (changes.dateAndTime) {
                html += `<li><strong>Dates:</strong> ${changes.dateAndTime.map(d => `${d.date} (${d.timeFrom}-${d.timeTo})`).join(", ")}</li>`;
            }
            if (changes.message) html += `<li><strong>Message:</strong> ${changes.message}</li>`;
            html += `</ul>`;
            detailsEl.innerHTML = html;
            pendingSection.style.display = "block";
        } catch (e) {
            pendingSection.style.display = "none";
        }
    } else {
        pendingSection.style.display = "none";
    }

    const refundSection = document.getElementById("refundSection");
    if (normalizeStatus(booking.status) === "CANCELLED" && booking.refundStatus === "PENDING_REFUND") {
        refundSection.style.display = "block";
    } else {
        refundSection.style.display = "none";
    }

    document.getElementById("manageBookingModal").classList.add("show");
}

function closeManageBookingModal() {
    currentManageBookingId = null;
    document.getElementById("manageBookingModal").classList.remove("show");
}

async function respondToClientChange(action) {
    if (!currentManageBookingId) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/organizer/profile/bookings/${currentManageBookingId}/respond-change?action=${action}`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error("Failed to respond to changes");
        showToast(`Request ${action === 'ACCEPT' ? 'accepted' : 'rejected'}`, "success");
        closeManageBookingModal();
        window.location.reload();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function updateBookingAdjustment() {
    if (!currentManageBookingId) return;
    const adjustment = parseFloat(document.getElementById("manageBookingAdjustment").value) || 0;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/organizer/profile/bookings/${currentManageBookingId}/adjust-price?adjustment=${adjustment}`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error("Failed to update adjustment");
        showToast("Price adjustment updated", "success");
        closeManageBookingModal();
        window.location.reload();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function markDepositRefunded() {
    if (!currentManageBookingId) return;
    if (!confirm("Are you sure you want to refund?")) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/organizer/profile/bookings/${currentManageBookingId}/refund`, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) throw new Error("Failed to mark as refunded");
        showToast("Deposit marked as refunded", "success");
        closeManageBookingModal();
        window.location.reload();
    } catch (err) {
        showToast(err.message, "error");
    }
}

document.getElementById("organizerBookingDetailClose")?.addEventListener("click", function() {
    const detailCard = document.getElementById("organizerBookingDetailCard");
    if (detailCard) detailCard.style.display = "none";
});

document.getElementById("adminPaymentConfirmClose")?.addEventListener("click", closeAdminPaymentConfirmModal);
document.getElementById("adminPaymentConfirmCancel")?.addEventListener("click", closeAdminPaymentConfirmModal);
document.getElementById("adminPaymentConfirmModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "adminPaymentConfirmModal") closeAdminPaymentConfirmModal();
});
document.getElementById("adminPaymentConfirmPay")?.addEventListener("click", confirmAdminPayment);
document.getElementById("adminPaymentConfirmCancel")?.addEventListener("click", closeAdminPaymentConfirmModal);
document.getElementById("adminPaymentConfirmClose")?.addEventListener("click", closeAdminPaymentConfirmModal);

async function updateOrganizerBookingStatus(bookingId, status) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/organizer/profile/bookings/${bookingId}/status?status=${encodeURIComponent(status)}`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to update booking");
        showToast("Booking updated successfully", "success", "bi-check-circle-fill");
        setTimeout(() => window.location.reload(), 1000);
        loadOrganizerBookings();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

function openAdminPaymentConfirmModal(booking) {
    pendingAdminPayment = {
        bookingId: booking.id,
        amount: booking.adminFeeAmount,
        eventName: booking.venueName || booking.eventName || "Event"
    };
    document.getElementById("adminPaymentConfirmEvent").textContent = pendingAdminPayment.eventName;
    document.getElementById("adminPaymentConfirmAmount").textContent = formatAmountValue(pendingAdminPayment.amount);
    document.getElementById("adminPaymentConfirmStage").textContent = "Admin Fee";
    document.getElementById("adminPaymentConfirmModal")?.classList.add("show");
}

function closeAdminPaymentConfirmModal() {
    pendingAdminPayment = null;
    document.getElementById("adminPaymentConfirmModal")?.classList.remove("show");
}

async function confirmAdminPayment() {
    if (!pendingAdminPayment?.bookingId) return;
    await payAdminFee(pendingAdminPayment.bookingId);
    closeAdminPaymentConfirmModal();
}

async function payAdminFee(bookingId) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/organizer/profile/bookings/${bookingId}/admin-payment`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to complete admin payment");
        showToast("Admin fee paid successfully", "success", "bi-check-circle-fill");
        setTimeout(() => window.location.reload(), 1000);
        loadOrganizerBookings();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

async function saveBookingPricing(bookingId) {
    const token = localStorage.getItem("token");
    const baseInput = document.getElementById("organizerBasePrice");
    const setupInput = document.getElementById("organizerSetupPrice");
    const baseVal = baseInput && baseInput.disabled ? null : (parseFloat(baseInput?.value || "0") || 0);
    const setupVal = setupInput && setupInput.disabled ? null : (parseFloat(setupInput?.value || "0") || 0);
    const totalVal = parseFloat(document.getElementById("organizerTotalPrice")?.value || "0") || 0;

    if (totalVal <= 0 && baseVal + setupVal <= 0) {
        showToast("Enter a valid price", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    const payload = {
        baseAmount: baseVal,
        setupAmount: setupVal,
        totalAmount: totalVal || null
    };

    try {
        const res = await fetch(`/organizer/profile/bookings/${bookingId}/pricing`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to update pricing");
        showToast("Pricing updated", "success", "bi-check-circle-fill");
        setTimeout(() => window.location.reload(), 1000);
        loadOrganizerBookings();
    } catch (err) {
        showToast(err.message, "error", "bi-x-circle-fill");
    }
}

function buildPaymentSummary(booking) {
    const status = normalizeStatus(booking.paymentStatus);
    const total = formatAmountValue(booking.totalAmountValue);
    const deposit = formatAmountValue(booking.depositAmount);
    const finalAmt = formatAmountValue(booking.finalAmount);
    const paid = formatAmountValue(booking.paidAmount);

    if (status === "QUOTE_REQUIRED") {
        return "Payment amount not available (price on request).";
    }
    if (!booking.totalAmountValue) {
        return "Payment details unavailable.";
    }

    if (status === "DEPOSIT_PAID") {
        return `First 50% received: ${deposit}. Remaining 50% (${finalAmt}) will open when the event starts.`;
    }
    if (status === "PENDING_FINAL") {
        return `First 50% received: ${deposit}. Remaining 50% due now: ${finalAmt}.`;
    }
    if (status === "PAID") {
        return `Both 50% payments received. Paid in full: ${total}.`;
    }
    if (status === "PENDING_DEPOSIT") {
        return `First 50% due: ${deposit}. Remaining 50% after event starts: ${finalAmt}.`;
    }

    let summary = `Total: ${total}. Paid: ${paid}.`;
    if ((booking.adminPaymentStatus || "").toUpperCase() === "PENDING_PAYMENT" && booking.adminFeeAmount != null) {
        summary += ` Admin fee due: ₹${booking.adminFeeAmount.toFixed(2)}.`;
    }
    if ((booking.adminPaymentStatus || "").toUpperCase() === "PAID" && booking.adminFeeAmount != null) {
        summary += ` Admin fee paid: ₹${booking.adminFeeAmount.toFixed(2)}.`;
    }
    return summary;
}

function formatAmountValue(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return " ";
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value))}`;
}


async function updateProfile() {
    const token = localStorage.getItem("token");
    const errorBox = document.getElementById("profileError");
    errorBox.innerText = "";

    const locations = document.querySelectorAll("input[name='organizerLocation[]']");
    const locationsArray = Array.from(locations).map(input => input.value.trim());
    
    const payload = {
        fullName: document.getElementById("fullName").value.trim(),
        contactNumber: document.getElementById("contactNumber").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        about: document.getElementById("about").value.trim(),
        locations: locationsArray,
        experience: document.getElementById("experience").value.trim(),
        description: document.getElementById("description").value.trim(),
        instagram: document.getElementById("instagram")?.value.trim() || "",
        facebook: document.getElementById("facebook")?.value.trim() || "",
        youTube: document.getElementById("youTube")?.value.trim() || "",
        website: document.getElementById("website")?.value.trim() || ""
    };

    try {
        const res = await fetch("/organizer/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text);

        loadProfile();
        showToast('Profile saved successfully!','success','bi-person-check-fill');
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        errorBox.innerText = err.message;
    }
}


document.addEventListener('click', function(e) {
  if (e.target.classList.contains('add-location')) {
    const container = document.getElementById('organizerLocations');
    const newInput = document.createElement('div');
    newInput.className = 'input-group mb-2';
    newInput.innerHTML = `
      <input type="text" class="form-control fld-input location-input" name="organizerLocation[]" placeholder="Enter address">
      <button type="button" class="btn btn-outline-secondary remove-location">-</button>
    `;
    container.appendChild(newInput);
  }
  if (e.target.classList.contains('remove-location')) {
    e.target.parentElement.remove();
  }
});



function logout() {
    if (!confirm("Are you sure you want to log out?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/join.html";
}


async function updatePassword() {
    const token = localStorage.getItem("token");
    const errorBox = document.getElementById("profileError");

    const payload = {
        currentPassword: document.getElementById("currentPassword").value.trim(),
        newPassword: document.getElementById("newPassword").value.trim(),
        confirmPassword: document.getElementById("confirmPassword").value.trim()
    };

    errorBox.innerText = "";

    if (!payload.currentPassword || !payload.newPassword || !payload.confirmPassword) {
        errorBox.innerText = "All fields are required";
        return;
    }

    if (payload.newPassword.length < 6) {
        errorBox.innerText = "New password must be at least 6 characters";
        return;
    }

    if (payload.newPassword !== payload.confirmPassword) {
        errorBox.innerText = "New password and confirm password do not match";
        return;
    }

    try {
        const res = await fetch("/client/profile/change-password", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        showToast('Password updated successfully!','success','bi-lock-fill');

        // Clear fields
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";

    } catch (err) {
        errorBox.innerText = err.message;
    }
}


async function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    const status = document.getElementById("uploadStatus");

    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        if (status) status.innerText = "File size must be under 5MB";
        showToast("File size must be under 5MB", "warning", "bi-exclamation-triangle-fill");
        return;
    }

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", file);

    try {
        status.innerText = "Uploading...";

        const res = await fetch("/organizer/profile/upload-profile-pic", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        status.innerText = "Upload successful ✅";

        // 🔥 Update profile image instantly
        document.getElementById("profileImage").src = data.imageUrl;
        document.querySelectorAll(".profilePicture").forEach(img => img.src = data.imageUrl);

    } catch (err) {
        status.innerText = err.message;
    }
}





// create/edit event section:

const publishEventBtn = document.getElementById("publishEvent");
const eventFormTitle = document.getElementById("eventFormTitle");
const eventFormSubtitle = document.getElementById("eventFormSubtitle");
const addNewEventBtn = document.getElementById("addNewEventBtn");
const editEventFromDetailBtn = document.getElementById("editEventFromDetail");
const deleteEventFromDetailBtn = document.getElementById("deleteEventFromDetail");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentEventId = null;
let isEditMode = false;
let currentViewedEventId = null;
let formSnapshot = "";
let venueExistingImageUrls = [];
let venueUploadedFiles = [];

function setEventFormMode(mode, eventId = null) {
    isEditMode = mode === "edit";
    currentEventId = isEditMode ? eventId : null;

    if (eventFormTitle) {
        eventFormTitle.textContent = isEditMode ? "Edit Event" : "Create New Event";
    }
    if (eventFormSubtitle) {
        eventFormSubtitle.textContent = isEditMode
            ? "Update the details for your event listing"
            : "Fill in the details to publish your service listing";
    }
    if (publishEventBtn) {
        publishEventBtn.innerHTML = isEditMode
            ? '<i class="bi bi-save2"></i> Update Event'
            : '<i class="bi bi-send-fill"></i> Publish Event';
    }
    if (cancelEditBtn) {
        cancelEditBtn.style.display = isEditMode ? "inline-flex" : "none";
    }
}

function buildEventPayload() {
    return {
        companyName: document.getElementById("companyName").value,
        venueName: document.getElementById("evVenueName").value,
        venueType: document.getElementById("evVenueType").value,
        location: document.getElementById("evLocation").value,
        city: document.getElementById("evCity").value,
        contactNumber: document.getElementById("evContactNumber").value,
        description: document.getElementById("evDesc").value,
        minCapacity: document.getElementById("minCapacity").value,
        maxCapacity: document.getElementById("maxCapacity").value,
        priceType: document.getElementById("evPriceType").value,
        priceUnit: document.getElementById("evPricePer").value,
        priceAmount: document.getElementById("evPrice").value || 0.0,
        availabilityDataType: document.getElementById("availabilityDataType").value,
        availabilityData: availabilityData(),
        amenities: getAmenities(),
        supportedEvents: getSupportedEvents(),
        venueImages: getVenueImages(),
        setups: getSetups()
    };
}

function getVenueImages() {
    return Array.isArray(venueExistingImageUrls) ? venueExistingImageUrls.slice() : [];
}

function getFormSnapshot() {
    return JSON.stringify(buildEventPayload());
}

function markFormSnapshot() {
    formSnapshot = getFormSnapshot();
}

function isFormDirty() {
    if (!formSnapshot) return false;
    return formSnapshot !== getFormSnapshot();
}

function resetAvailabilityRows() {
    const container = document.getElementById("availabilityDatesContainer");
    if (!container) return;
    container.innerHTML = "";

    const row = document.createElement("div");
    row.className = "availability-data availability-row mb-3 p-3";
    row.style.cssText = "background:var(--bg-subtle);border-radius:8px;border:1px solid var(--border)";
    row.innerHTML = `
      <div class="row g-2">
        <div class="col-md-4">
          <label class="fld-label">Date *</label>
          <input type="date" class="fld-input availability-date" />
        </div>
        <div class="col-md-3">
          <label class="fld-label">From Time *</label>
          <input type="time" class="fld-input availability-time-from" />
        </div>
        <div class="col-md-3">
          <label class="fld-label">To Time *</label>
          <input type="time" class="fld-input availability-time-to" />
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <button type="button" class="fld-input availability-remove-btn w-100" >
            <i class="bi bi-trash3"></i> Remove
          </button>
        </div>
      </div>
    `;
    container.appendChild(row);
}

function resetSetupCards() {
    if (!setupCardsContainer) return;
    const template = setupCardsContainer.querySelector(".setup-card");
    if (!template) return;

    setupCardsContainer.innerHTML = "";
    const clone = template.cloneNode(true);
    clone.querySelectorAll("input[type=\"text\"], textarea, input[type=\"number\"]").forEach(el => {
        el.value = "";
    });
    clone.querySelectorAll("input[type=\"file\"]").forEach(el => {
        el.value = "";
    });
    clone.querySelectorAll(".setup-preview-imgs").forEach(p => p.innerHTML = "");
    clone.querySelectorAll("input[type=\"checkbox\"], input[type=\"radio\"]").forEach(el => {
        el.checked = false;
    });

    // Clear uploaded files
    clone._uploadedFiles = [];

    initSetupCard(clone, 0);
    setupIndexCounter = 0;
    setupCardsContainer.appendChild(clone);
}

function resetEventForm() {
    document.getElementById("evVenueName").value = "";
    document.getElementById("evVenueType").value = "";
    document.getElementById("evLocation").value = "";
    document.getElementById("evCity").value = "";
    document.getElementById("evContactNumber").value = "";
    document.getElementById("evDesc").value = "";
    document.getElementById("minCapacity").value = "";
    document.getElementById("maxCapacity").value = "";
    document.getElementById("evPriceType").value = "";
    document.getElementById("evPricePer").value = "per-day";
    document.getElementById("evPrice").value = "";
    document.getElementById("availabilityDataType").value = "Available On:";

    const priceTypeEl = document.getElementById("evPriceType");
    if (priceTypeEl) priceTypeEl.dispatchEvent(new Event("change", { bubbles: true }));

    document.querySelectorAll("input[name=\"amenities\"]").forEach(cb => {
        cb.checked = false;
    });
    document.querySelectorAll("input[name=\"supportedEvents\"]").forEach(cb => {
        cb.checked = false;
    });

    const customAmenities = document.getElementById("customAmenitiesCheckboxes");
    if (customAmenities) customAmenities.innerHTML = "";

    venueExistingImageUrls = [];
    venueUploadedFiles = [];
    renderVenuePreview();
    resetSetupCards();
    resetAvailabilityRows();
    setEventFormMode("create");
    markFormSnapshot();
}

function ensureSupportedEventOption(label) {
    const container = document.getElementById("supportedEventsTags");
    if (!container) return;
    const existing = Array.from(container.querySelectorAll("input[name=\"supportedEvents\"]"))
        .find(input => input.value === label);
    if (existing) return;

    const id = "se_custom_" + Date.now();
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "supportedEvents";
    input.className = "btn-check";
    input.value = label;
    input.id = id;
    input.autocomplete = "off";

    const btn = document.createElement("label");
    btn.className = "btn btn-outline-secondary btn-sm tag-check";
    btn.htmlFor = id;
    btn.textContent = label;

    container.appendChild(input);
    container.appendChild(btn);
}

function populateEventForm(event) {
    if (!event) return;

    document.getElementById("evVenueName").value = event.venueName || "";
    document.getElementById("evVenueType").value = event.venueType || "";
    document.getElementById("evLocation").value = event.location || "";
    document.getElementById("evCity").value = event.city || "";
    document.getElementById("evContactNumber").value = event.contactNumber || "";
    document.getElementById("evDesc").value = event.description || "";
    document.getElementById("minCapacity").value = event.minCapacity || "";
    document.getElementById("maxCapacity").value = event.maxCapacity || "";
    document.getElementById("evPriceType").value = event.priceType || "";
    document.getElementById("evPricePer").value = event.priceUnit || "per-day";
    document.getElementById("evPrice").value = event.priceAmount || "";
    document.getElementById("availabilityDataType").value = event.availabilityDataType || "Available On:";
    venueExistingImageUrls = Array.isArray(event.venueImages) ? event.venueImages.slice() : [];
    venueUploadedFiles = [];
    renderVenuePreview();
    const priceTypeEl = document.getElementById("evPriceType");
    if (priceTypeEl) priceTypeEl.dispatchEvent(new Event("change", { bubbles: true }));

    document.querySelectorAll("input[name=\"amenities\"]").forEach(cb => {
        cb.checked = false;
    });
    (event.amenities || []).forEach(amenity => {
        let input = document.querySelector(`input[name="amenities"][value="${amenity}"]`);
        if (!input) {
            addAmenityCheckbox(amenity);
            input = document.querySelector(`input[name="amenities"][value="${amenity}"]`);
        }
        if (input) input.checked = true;
    });

    document.querySelectorAll("input[name=\"supportedEvents\"]").forEach(cb => {
        cb.checked = false;
    });
    (event.supportedEvents || []).forEach(label => {
        ensureSupportedEventOption(label);
        const input = document.querySelector(`input[name="supportedEvents"][value="${label}"]`);
        if (input) input.checked = true;
    });

    if (setupCardsContainer) {
        const template = setupCardsContainer.querySelector(".setup-card");
        setupCardsContainer.innerHTML = "";
        setupIndexCounter = 0;

        const setups = Array.isArray(event.setups) ? event.setups : [];
        if (!setups.length && template) {
            const blank = template.cloneNode(true);
            initSetupCard(blank, 0);
            setupCardsContainer.appendChild(blank);
        } else {
            setups.forEach((setup, index) => {
                if (!template) return;
                const clone = template.cloneNode(true);
                clone.querySelector(".setup-name").value = setup.setupName || "";
                clone.querySelector(".setup-desc").value = setup.setupDescription || "";
                const priceCond = clone.querySelector(".setup-price-cond");
                if (priceCond) priceCond.value = setup.priceConditions || "";
                const pricePer = clone.querySelector("#setupPricePer");
                if (pricePer) pricePer.value = setup.pricePer || "per-day";
                const price = clone.querySelector(".setup-price");
                if (price) price.value = setup.setupPrice || "";
                const availability = clone.querySelector(".setup-availability");
                if (availability) availability.value = setup.availability || "Available";
                const customCheck = clone.querySelector(".custom-setup-checkbox");
                if (customCheck) customCheck.checked = !!setup.customAvailable;

                const preview = clone.querySelector(".setup-preview-imgs");
                clone._existingImageUrls = Array.isArray(setup.images) ? setup.images.slice() : [];
                clone._uploadedFiles = [];
                if (preview) {
                    preview.innerHTML = "";
                    clone._existingImageUrls.forEach((url, imgIndex) => {
                        const imgContainer = document.createElement("div");
                        imgContainer.className = "preview-img-container";
                        imgContainer.innerHTML = `
                            <img src="${url}" class="preview-img-thumb" alt="Setup image ${imgIndex + 1}" />
                            <button class="remove-img-btn" type="button" onclick="removeSetupImage(this, ${imgIndex}, 'existing')">
                                <i class="bi bi-x"></i>
                            </button>
                        `;
                        preview.appendChild(imgContainer);
                    });
                }

                initSetupCard(clone, index);
                setupCardsContainer.appendChild(clone);
            });
            setupIndexCounter = setups.length - 1;
        }

        setupCardsContainer.querySelectorAll(".setup-price-cond").forEach(select => {
            select.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    const container = document.getElementById("availabilityDatesContainer");
    if (container) {
        container.innerHTML = "";
        const items = Array.isArray(event.availabilityData) ? event.availabilityData : [];
        if (!items.length) {
            resetAvailabilityRows();
        } else {
            items.forEach(ad => {
                const row = document.createElement("div");
                row.className = "availability-data availability-row mb-3 p-3";
                row.style.cssText = "background:var(--bg-subtle);border-radius:8px;border:1px solid var(--border)";
                row.innerHTML = `
                  <div class="row g-2">
                    <div class="col-md-4">
                      <label class="fld-label">Date *</label>
                      <input type="date" class="fld-input availability-date" value="${ad.date || ""}"/>
                    </div>
                    <div class="col-md-3">
                      <label class="fld-label">From Time *</label>
                      <input type="time" class="fld-input availability-time-from" value="${ad.timeFrom || ""}"/>
                    </div>
                    <div class="col-md-3">
                      <label class="fld-label">To Time *</label>
                      <input type="time" class="fld-input availability-time-to" value="${ad.timeTo || ""}"/>
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                      <button type="button" class="fld-input availability-remove-btn w-100" >
                        <i class="bi bi-trash3"></i> Remove
                      </button>
                    </div>
                  </div>
                `;
                container.appendChild(row);
            });
        }
    }
    markFormSnapshot();
}

async function loadEventForEdit(eventId) {
    if (isFormDirty()) {
        const confirmSwitch = confirm("You have unsaved changes. Overwrite them with this event’s data?");
        if (!confirmSwitch) return;
    }
    const token = localStorage.getItem("token");
    const errorBox = document.getElementById("errorBox");
    if (errorBox) errorBox.innerText = "";

    try {
        const res = await fetch("/organizer/profile/event-details", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ eventId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || "Failed to load event");

        setEventFormMode("edit", data.id || eventId);
        populateEventForm(data);
        navigateTo("create-event");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
        if (errorBox) errorBox.innerText = err.message;
    }
}

if (publishEventBtn) {
    publishEventBtn.addEventListener("click", async function(e) {
        e.preventDefault();

        const token = localStorage.getItem("token");
        const errorBox = document.getElementById("errorBox");
        if (errorBox) errorBox.innerText = "";

        const setups = getSetups();
        const setupCards = Array.from(document.querySelectorAll('.setup-card'));
        const hasUploadedSetupFiles = setupCards.some(card => Array.isArray(card._uploadedFiles) && card._uploadedFiles.length > 0);
        const hasUploadedVenueFiles = Array.isArray(venueUploadedFiles) && venueUploadedFiles.length > 0;

        let payload, headers, body;

        if (hasUploadedSetupFiles || hasUploadedVenueFiles) {
            // Use FormData for file uploads
            const formData = new FormData();

            // Add basic event data without raw File objects
            const eventData = buildEventPayload();
            formData.append("eventData", JSON.stringify(eventData));

            // Add new venue image files
            (venueUploadedFiles || []).forEach((file, imageIndex) => {
                formData.append(`venue_image_${imageIndex}`, file);
            });

            // Add new setup image files from each card
            setupCards.forEach((card, setupIndex) => {
                (card._uploadedFiles || []).forEach((file, imageIndex) => {
                    formData.append(`setup_${setupIndex}_image_${imageIndex}`, file);
                });
            });

            headers = { "Authorization": "Bearer " + token };
            body = formData;
        } else {
            // Use JSON for regular data
            payload = buildEventPayload();
            headers = {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            };
            body = JSON.stringify(payload);
        }

        const isEditing = isEditMode && currentEventId;
        const url = isEditing
            ? `/organizer/profile/events/${encodeURIComponent(currentEventId)}`
            : "/organizer/profile/create-event";
        const method = isEditing ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers,
                body
            });

            const text = await res.text();
            if (!res.ok) throw new Error(text);

            showToast(
                isEditing ? "Event updated successfully!" : "Event created successfully!",
                "success",
                "bi-calendar-check-fill"
            );

            // Automatic refresh after a short delay to show the toast
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err) {
            if (errorBox) errorBox.innerText = err.message;
        }
    });
}

if (addNewEventBtn) {
    addNewEventBtn.addEventListener("click", () => {
        resetEventForm();
    });
}

if (editEventFromDetailBtn) {
    editEventFromDetailBtn.addEventListener("click", () => {
        if (currentViewedEventId) {
            loadEventForEdit(currentViewedEventId);
        }
    });
}

if (deleteEventFromDetailBtn) {
    deleteEventFromDetailBtn.addEventListener("click", () => {
        if (!currentViewedEventId) return;
        if (confirm("Delete this event listing?")) {
            deleteEvent(currentViewedEventId);
            backToMyEvents();
        }
    });
}

const createEventNav = document.querySelector('.sb-link[data-page="create-event"]');
if (createEventNav) {
    createEventNav.addEventListener("click", () => {
        resetEventForm();
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
        setEventFormMode("create");
        markFormSnapshot();
    });
}

if (!formSnapshot) {
    markFormSnapshot();
}


function getAmenities() {
  const amenities = [];
  document.querySelectorAll('input[name="amenities"]:checked').forEach(cb => {
    amenities.push(cb.value);
  });

  return amenities;
}

function getSupportedEvents(){
  const events = [];
  document.querySelectorAll('input[name="supportedEvents"]:checked').forEach(cb => {
    events.push(cb.value);
  });
  return events;
}

function getSetups() {
  const setups = [];

  document.querySelectorAll('.setup-card').forEach(card => {
    const existingUrls = Array.isArray(card._existingImageUrls) ? card._existingImageUrls.slice() : [];
    const setup = {
      setupName: card.querySelector('.setup-name')?.value || "",
      setupDescription: card.querySelector('.setup-desc')?.value || "",
      priceConditions: card.querySelector('.setup-price-cond')?.value || "",
      pricePer: card.querySelector('#setupPricePer')?.value || "",
      setupPrice: card.querySelector('.setup-price')?.value || "",
      availability: card.querySelector('.setup-availability')?.value || "Available",
      customAvailable: card.querySelector('.custom-setup-checkbox')?.checked || false,
      images: existingUrls
    };

    setups.push(setup);
  });

  return setups;
}

function availabilityData() {
  const data = [];
  document.querySelectorAll('.availability-data').forEach(d => {
    const dsteTime = {
      date: d.querySelector('.availability-date')?.value || "",
      timeFrom: d.querySelector('.availability-time-from')?.value || "",
      timeTo: d.querySelector('.availability-time-to')?.value || ""
    };
    data.push(dsteTime);
  });
  return data;
}


// render event cards in my events page:
document.getElementById('myEvents')?.addEventListener("click", loadMyEvents);
async function loadMyEvents() {
  const token = localStorage.getItem("token");
  const errorBox = document.getElementById("errorBox");
  if (errorBox) errorBox.innerText = "";

  try {
    const res = await fetch("/organizer/profile/my-events", {
      headers: { Authorization: "Bearer " + token }
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText || "Unable to load events");

    let events = [];
    try {
      events = JSON.parse(text);
      organizerMyEvents = events;
    } catch {
      events = [];
      organizerMyEvents = [];
    }

    renderMyEvents(organizerMyEvents);
  } catch (err) {
    if (errorBox) errorBox.innerText = err.message;
    console.error("Error loading events:", err);
  }
}

document.getElementById("myEventsSearch")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = organizerMyEvents.filter(ev => {
        const name = (ev.venueName || "").toLowerCase();
        const city = (ev.city || "").toLowerCase();
        const type = (ev.venueType || "").toLowerCase();
        return name.includes(query) || city.includes(query) || type.includes(query);
    });
    renderMyEvents(filtered);
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

function renderMyEvents(events) {
  const container = document.getElementById("myEventsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = `<div class="no-items-message">No events found yet. Click Add New Event to publish your first listing.</div>`;
    return;
  }

  events.forEach(event => {
    if (event?.id && event?.venueName) eventNameById.set(event.id, event.venueName);

    const eventImage = getEventPrimaryImage(event);
    const card = document.createElement("div");
    card.className = "event-card";
    card.dataset.eventId = event.id;

    const adminBadge = (event.adminStatus === "FLAGGED") ? `<div class="admin-badge badge-flagged"><i class="bi bi-flag-fill"></i>Flagged</div>` : 
                       (event.adminStatus === "HIDDEN") ? `<div class="admin-badge badge-hidden"><i class="bi bi-eye-slash-fill"></i>Hidden</div>` : 
                       (event.adminStatus === "DELETED") ? `<div class="admin-badge badge-deleted"><i class="bi bi-trash-fill"></i>Deleted</div>` : "";

    card.innerHTML = `
        <div class="event-img-wrap">
          ${adminBadge}
          <img src="${eventImage}" class="event-img" alt="${event.venueName || 'Event image'}"/>
          <div class="event-img-overlay">
            <button class="ev-action-btn ev-edit" title="Edit"><i class="bi bi-pencil"></i></button>
            <button class="ev-action-btn ev-del" title="Delete"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
        <div class="event-body g-4">
          <div class="event-title">${event.venueName}</div>
          <div class="ev-meta-item"><i class="bi bi-geo-alt"></i>${event.city}</div>
          <div class="event-meta">
            <div class="ev-meta-item"><i class="bi bi-people"></i>Up to ${event.maxCapacity}</div>
            <div class="ev-meta-item event-rating-meta">
              <i class="bi bi-star-fill" style="color:#F59E0B"></i>
              <span class="event-rating-value">—</span>
              <span class="event-rating-count" style="margin-left:6px;color:var(--txt-m)">Loading</span>
            </div>
          </div>
          <div class="ev-meta-item myEvCardVenTy"><i class="bi bi-flower2"></i>${event.venueType}</div>
          <div class="event-footer">
            <div class="event-price">${generatePriceHTML(event)}</div>
          </div>
        </div>
    `;

    function generatePriceHTML(event) {

        if (event.priceType === "Depends on the setup") {
            return "Depends on the setup";
        }

        if (event.priceType === "Price on request") {
            return "Price on request";
        }

        return event.priceAmount
            ? `₹${event.priceAmount} <span>${event.priceUnit}</span>`
            : "Contact for price";
    }

    
    card.addEventListener("click", async function (e) {

        if (e.target.closest(".ev-edit") || e.target.closest(".ev-del")) {
            return;
        }
    
        const eventId = this.dataset.eventId;
        console.log("Clicked:", eventId);

        const token = localStorage.getItem("token");

        try {
            const res = await fetch("/organizer/profile/event-details", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    "eventId": eventId
                })
            });

            const data = await res.json();
            console.log("Event Details:", data);
        } catch (err) {
            console.error("Error fetching event details:", err);
            return;
        }

        // set data in detailed view and redirect
        document.querySelector(".my-events-card-wrap").style.display = "none";
        document.querySelector(".my-event-wrap").style.display = "block";
        const heroGallery = document.querySelector(".my-event-wrap .hero-gallery");
    if (heroGallery) {
        const existingBadge = heroGallery.querySelector(".admin-badge");
        if (existingBadge) existingBadge.remove();

        const s = (event.adminStatus || "").toUpperCase();
        if (s && s !== "PUBLISHED") {
            const badge = document.createElement("div");
            badge.className = `admin-badge ${s === "FLAGGED" ? "badge-flagged" : (s === "HIDDEN" ? "badge-hidden" : "badge-deleted")}`;
            badge.style.top = "20px";
            badge.style.left = "20px";
            badge.innerHTML = `<i class="bi ${s === "FLAGGED" ? "bi-flag-fill" : (s === "HIDDEN" ? "bi-eye-slash-fill" : "bi-trash-fill")}"></i> ${s} by Admin`;
            heroGallery.appendChild(badge);
        }
    }
        renderEventDetails(event);
        loadEventReviewData(event.id);

    });

    container.appendChild(card);
    attachEventReviewSummary(event.id, card);
  });
}

const myEventsContainer = document.getElementById("myEventsContainer");
if (myEventsContainer) {
  myEventsContainer.addEventListener("click", e => {
    const editBtn = e.target.closest(".ev-edit");
    if (!editBtn) return;
    e.stopPropagation();
    const card = editBtn.closest(".event-card");
    const eventId = card?.dataset?.eventId;
    if (eventId) loadEventForEdit(eventId);
  });
}

async function deleteEvent(eventId) {
  const token = localStorage.getItem("token");
  const errorBox = document.getElementById("errorBox");
  if (errorBox) errorBox.innerText = "";

  try {
    const res = await fetch(`/organizer/profile/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to delete event");
        showToast("Event deleted successfully", "success", "bi-trash3-fill");
        setTimeout(() => window.location.reload(), 1000);
  } catch (err) {
    if (errorBox) errorBox.innerText = err.message;
  }
}

if (myEventsContainer) {
  myEventsContainer.addEventListener("click", e => {
    const delBtn = e.target.closest(".ev-del");
    if (!delBtn) return;
    e.stopPropagation();
    const card = delBtn.closest(".event-card");
    const eventId = card?.dataset?.eventId;
    if (!eventId) return;
    if (confirm("Delete this event listing?")) {
      deleteEvent(eventId);
    }
  });
}


function renderEventDetails(event) {
    currentViewedEventId = event?.id || null;

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
                <div class="gallery-carousel">
                    <button type="button" class="gallery-nav prev"><i class="bi bi-chevron-left"></i></button>
                    <img class="gallery-current" src="" alt="Current image" />
                    <button type="button" class="gallery-nav next"><i class="bi bi-chevron-right"></i></button>
                </div>
                <div class="gallery-meta"><span class="gallery-count"></span></div>
                <div class="gallery-thumbs"></div>
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
            morePhotosBtn.innerHTML = `<i class="bi bi-images"></i> See all ${displayImages.length}`;
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
            expandedRow.style.display = "none";
        }
    }

    document.querySelector(".meta-item strong").textContent = event.city;

    document.querySelectorAll(".meta-item strong")[1].textContent = event.maxCapacity;

    // Description
    document.getElementById("detailDescription").textContent = event.description;

    document.querySelectorAll(".venueType").forEach(vt => vt.textContent = event.venueType);

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
        pricePerEl.textContent = event.priceUnit.replace("-", " ");
        priceAmountQe.textContent = "₹" + event.priceAmount + " ";
        pricePerElQe.textContent = " /"+ event.priceUnit.replace("-", " ");
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
            ? `<button type="button" class="btn-ghost-sm btn-sm setup-see-all-btn" style="margin-top:12px;display:inline-flex;align-items:center;gap:8px">
                    <i class="bi bi-images"></i> See all ${setup.images.length}
               </button>
               <div class="setup-images-carousel" data-setup-images='${JSON.stringify(setup.images)}' style="display:none;margin-top:12px;">
                   <div class="setup-carousel-view">
                       <button type="button" class="setup-carousel-nav prev"><i class="bi bi-chevron-left"></i></button>
                       <img class="setup-carousel-current" src="${setup.images[0]}" alt="${setup.setupName || 'Setup'} image 1" />
                       <button type="button" class="setup-carousel-nav next"><i class="bi bi-chevron-right"></i></button>
                   </div>
                   <div class="setup-carousel-pager"><span class="setup-carousel-index">1</span> / ${setup.images.length}</div>
                   <div class="setup-carousel-thumbs">
                       ${setup.images.map((url, imageIndex) => `
                           <img src="${url}" class="setup-thumb${imageIndex === 0 ? ' active' : ''}" data-image-index="${imageIndex}" alt="${setup.setupName || 'Setup'} ${imageIndex + 1}" />
                       `).join("")}
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
}







document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      if (e.target.closest('.add-amenity-btn')) {
        const input = e.target.closest('.add-amenity-btn').previousElementSibling;
        const amenityText = input.value.trim();
        
        if (amenityText) {
          addAmenityCheckbox(amenityText);
          input.value = '';
        }
      }
    });
  });
  
  function addAmenityCheckbox(amenityName) {
    const container = document.getElementById('customAmenitiesCheckboxes');
    const id = 'amenity_' + Date.now();
    
    const checkbox = document.createElement('div');
    checkbox.className = 'col-6';
    checkbox.innerHTML = `
      <label class="form-check amenity-check">
        <input id="${id}" name="amenities" class="form-check-input" type="checkbox" value="${amenityName}"/>
        <span class="form-check-label">${amenityName}</span>
      </label>
    `;
    
    container.appendChild(checkbox);
}


// Handle adding another availability date
document.getElementById('addAvailabilityBtn')?.addEventListener('click', function() {
  const container = document.getElementById('availabilityDatesContainer');
  const newRow = document.createElement('div');
  newRow.className = 'availability-data availability-row mb-3 p-3';
  newRow.style.cssText = 'background:var(--bg-subtle);border-radius:8px;border:1px solid var(--border)';
  
  newRow.innerHTML = `
    <div class="row g-2">
      <div class="col-md-4">
        <label class="fld-label">Date *</label>
        <input type="date" class="fld-input availability-date" />
      </div>
      <div class="col-md-3">
        <label class="fld-label">From Time *</label>
        <input type="time" class="fld-input availability-time-from" />
      </div>
      <div class="col-md-3">
        <label class="fld-label">To Time *</label>
        <input type="time" class="fld-input availability-time-to" />
      </div>
      <div class="col-md-2 d-flex align-items-end">
        <button type="button" class="fld-input availability-remove-btn w-100" >
          <i class="bi bi-trash3"></i> Remove
        </button>
      </div>
    </div>
  `;
  
  container.appendChild(newRow);
  
  // Attach remove listener to new row
  newRow.querySelector('.availability-remove-btn').addEventListener('click', function() {
    newRow.remove();
  });
});

// Handle removing availability dates
document.addEventListener('click', function(e) {
  if (e.target.closest('.availability-remove-btn')) {
    e.target.closest('.availability-row').remove();
  }
});



function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function logout() {
    if (!confirm("Are you sure you want to log out?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/join.html";
}


document.addEventListener("change", e => {
  if (e.target.classList.contains("setup-price-cond")) {
    const card = e.target.closest(".setup-card");
    const pricePer = card.querySelector("#setupPricePer");
    const currencyWrap = card.querySelector(".currency-wrap");

    currencyWrap.style.display =
      e.target.value === "included" || e.target.value === "request" ? "none" : "block";
    pricePer.style.display =
      e.target.value === "included" || e.target.value === "request" ? "none" : "block";
  }
});


const evPriceType = document.getElementById("evPriceType");
const pricingAmount = document.getElementsByClassName("pricingAmount")[0];

if (evPriceType && pricingAmount) {

  const togglePrice = () => {
    const hide =
      evPriceType.value === "Depends on the setup" ||
      evPriceType.value === "Price on request";

    pricingAmount.style.display = hide ? "none" : "block";
  };

  togglePrice(); // run once
  evPriceType.addEventListener("change", togglePrice);
}

function backToMyEvents(){
  document.querySelector(".my-event-wrap").style.display = "none";
  document.querySelector(".my-events-card-wrap").style.display = "block";
}

















/* ─────────────── NAVIGATION ─────────────── */
const pages   = document.querySelectorAll('.page');
const sbLinks = document.querySelectorAll('.sb-link[data-page]');

const pageTitles = {
  'dashboard':    ['Dashboard',       'Welcome back'],
  'my-events':    ['My Events',       'Manage your active service listings'],
  'create-event': ['Create Event',    'Add a new service to your portfolio'],
  'bookings':     ['Bookings Received','Review and respond to client requests'],
  'portfolio':    ['Portfolio / Gallery','Showcase your event photography'],
  'analytics':    ['Analytics',       'Event performance by month and year'],
  'reviews':      ['Reviews & Ratings','Client feedback and your reputation'],
  'earnings':     ['Earnings',        'Revenue, admin fees, and profit statements'],
  'settings':     ['Profile Settings','Update your organizer profile'],

};

function navigateTo(pageId) {
  localStorage.setItem("currentOrganizerPage", pageId);
  pages.forEach(p => p.classList.remove('active'));
  sbLinks.forEach(l => l.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  const activeLink = document.querySelector(`.sb-link[data-page="${pageId}"]`);
  if (activeLink) activeLink.classList.add('active');

  const [title, crumb] = pageTitles[pageId] || ['Dashboard', 'Welcome back'];
  document.getElementById('hdrTitle').textContent = title;
  document.getElementById('hdrCrumb').textContent = crumb;

  if (pageId === 'my-events') {
    loadMyEvents();
  }

  if (pageId === 'reviews') {
    loadOrganizerReviews();
  }

  if (pageId === 'analytics') {
    loadOrganizerAnalytics();
  }

  if (pageId === 'earnings') {
    loadOrganizerEarnings();
  }

  if (window.innerWidth <= 768) closeSidebar();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

sbLinks.forEach(link => {
  link.addEventListener('click', () => navigateTo(link.dataset.page));
});

/* ─────────────── MOBILE SIDEBAR ─────────────── */
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sbOverlay');
const hamburger = document.getElementById('mobileHamburger');

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

hamburger.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
overlay.addEventListener('click', closeSidebar);

/* ─────────────── DROPDOWNS ─────────────── */
const qaBtn = document.getElementById('qaBtn');
const qaDd = document.getElementById('qaDd');
const avatarBtn = document.getElementById('avatarBtn');
const profileDd = document.getElementById('profileDd');

qaBtn?.addEventListener('click', e => {
    e.stopPropagation();
    qaDd?.classList.toggle('show');
    profileDd?.classList.remove('show');
});

avatarBtn?.addEventListener('click', e => {
    e.stopPropagation();
    profileDd?.classList.toggle('show');
    qaDd?.classList.remove('show');
});

document.addEventListener('click', () => {
    qaDd?.classList.remove('show');
    profileDd?.classList.remove('show');
});

/* ─────────────── FILTER TABS ─────────────── */
document.querySelectorAll('.filter-bar').forEach(bar => {
  bar.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      bar.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });
});

/* ─────────────── IMAGE PREVIEW ─────────────── */
function renderVenuePreview() {
  const preview = document.getElementById('previewImgs');
  if (!preview) return;
  preview.innerHTML = '';

  venueExistingImageUrls.forEach((url, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-img-container';
    imgContainer.innerHTML = `
      <img src="${url}" class="preview-img-thumb" alt="Venue image ${index + 1}" />
      <button class="remove-img-btn" type="button" onclick="removeVenueImage(this, ${index}, 'existing')">
        <i class="bi bi-x"></i>
      </button>
    `;
    preview.appendChild(imgContainer);
  });

  venueUploadedFiles.forEach((f, index) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'preview-img-container';
      imgContainer.innerHTML = `
        <img src="${ev.target.result}" class="preview-img-thumb" alt="Venue image ${index + 1}" />
        <button class="remove-img-btn" type="button" onclick="removeVenueImage(this, ${index}, 'uploaded')">
          <i class="bi bi-x"></i>
        </button>
      `;
      preview.appendChild(imgContainer);
    };
    reader.readAsDataURL(f);
  });
}

function handleImgUpload(e) {
  const files = Array.from(e.target.files || []);
  venueUploadedFiles = venueUploadedFiles.concat(files);
  renderVenuePreview();
  e.target.value = "";
}

function removeVenueImage(button, index, source = 'uploaded') {
  if (source === 'existing') {
    venueExistingImageUrls.splice(index, 1);
  } else {
    venueUploadedFiles.splice(index, 1);
  }
  renderVenuePreview();
}

function handleSetupImgUpload(e) {
  const input = e.target;
  const card = input.closest('.setup-card');
  if (!card) return;
  const preview = card.querySelector('.setup-preview-imgs');
  if (!preview) return;

  const newFiles = Array.from(input.files || []);
  card._uploadedFiles = Array.isArray(card._uploadedFiles) ? card._uploadedFiles.concat(newFiles) : newFiles;
  renderSetupPreview(card);
  input.value = "";
}

function removeSetupImage(button, index, source = 'uploaded') {
  const card = button.closest('.setup-card');
  if (!card) return;

  if (source === 'existing') {
    card._existingImageUrls = Array.isArray(card._existingImageUrls) ? card._existingImageUrls.slice() : [];
    card._existingImageUrls.splice(index, 1);
  } else {
    if (!Array.isArray(card._uploadedFiles)) card._uploadedFiles = [];
    card._uploadedFiles.splice(index, 1);
  }

  renderSetupPreview(card);
}

function renderSetupPreview(card) {
  if (!card) return;
  const preview = card.querySelector('.setup-preview-imgs');
  if (!preview) return;

  preview.innerHTML = '';
  const existingImages = Array.isArray(card._existingImageUrls) ? card._existingImageUrls : [];
  const uploadedFiles = Array.isArray(card._uploadedFiles) ? card._uploadedFiles : [];

  existingImages.forEach((url, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'preview-img-container';
    imgContainer.innerHTML = `
      <img src="${url}" class="preview-img-thumb" alt="Setup image ${index + 1}" />
      <button class="remove-img-btn" type="button" onclick="removeSetupImage(this, ${index}, 'existing')">
        <i class="bi bi-x"></i>
      </button>
    `;
    preview.appendChild(imgContainer);
  });

  uploadedFiles.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'preview-img-container';
      imgContainer.innerHTML = `
        <img src="${ev.target.result}" class="preview-img-thumb" alt="Setup image ${existingImages.length + index + 1}" />
        <button class="remove-img-btn" type="button" onclick="removeSetupImage(this, ${index}, 'uploaded')">
          <i class="bi bi-x"></i>
        </button>
      `;
      preview.appendChild(imgContainer);
    };
    reader.readAsDataURL(file);
  });
}

/* ─────────────── TAG INPUT ─────────────── */
const tagInput = document.getElementById('tagInput');
const tagChips = document.getElementById('tagChips');

if (tagInput) {
  tagInput.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
      e.preventDefault();
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.innerHTML = tagInput.value.trim() + ' <span class="remove-chip" onclick="this.parentElement.remove()">✕</span>';
      tagChips.appendChild(chip);
      tagInput.value = '';
    }
  });
}

/* ─────────────── SUPPORTED EVENTS TAGS ─────────────── */
const supportedEventsContainer = document.getElementById('supportedEventsTags');

if (supportedEventsContainer) {
  const supportedEvents = [
    'Corporate Meeting',
    'Business Conference',
    'Career Guidance Event',
    'Press Conference',
    'Seminar',
    'Networking Event',
    'Business Pitch Session',
    'Panel Discussion',
    'Workshop',
    'Annual Business Review',
    'Startup Demo Day',
    'Corporate Training Session',
    'Guest Lecture',
    'Student Development Session',
    'Faculty Development Program (FDP)',
    'Research Presentation',
    'Technical Talk',
    'Academic Symposium',
    'Orientation Program',
    'Leadership Training',
    'Skill Development Event',
    'Certification Session',
    'Team-Building Session',
    'Investor Meetup',
    'Soft Skills Workshop',
    'Entrepreneurship Event',
    'Digital Marketing Bootcamp',
    'Brand Launch',
    'Trade Exhibit (Half-Day)',
    'Product Launch',
    'CSR Activity',
    'Award Ceremony',
    'Other'
  ];

  supportedEvents.forEach((label, index) => {
    const id = 'se_' + index;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'supportedEvents';
    input.className = 'btn-check';
    input.value = label;
    input.id = id;
    input.autocomplete = 'off';

    const btn = document.createElement('label');
    btn.className = 'btn btn-outline-secondary btn-sm tag-check';
    btn.htmlFor = id;
    btn.textContent = label;

    supportedEventsContainer.appendChild(input);
    supportedEventsContainer.appendChild(btn);
  });
}

/* ─────────────── SETUP & DECORATION CARDS ─────────────── */
let setupIndexCounter = 0;
const setupCardsContainer = document.getElementById('setupCardsContainer');
const addSetupBtn = document.getElementById('addSetupBtn');

function initSetupCard(card, index) {
  if (!card) return;
  card.dataset.setupIndex = index;

  const availInputs = card.querySelectorAll('[data-role="availability-input"]');
  availInputs.forEach(input => {
    const variant = input.dataset.variant || 'opt';
    const id = `setupAvail_${index}_${variant}`;
    input.id = id;
    input.name = `setupAvailability_${index}`;
    const label = card.querySelector(`[data-role="availability-label"][data-variant="${variant}"]`);
    if (label) label.htmlFor = id;
  });

  if (availInputs.length) {
    availInputs[0].checked = true;
  }
}

function addSetupCard() {
  if (!setupCardsContainer) return;
  const template = setupCardsContainer.querySelector('.setup-card');
  if (!template) return;

  const newIndex = ++setupIndexCounter;
  const clone = template.cloneNode(true);

  clone.querySelectorAll('input[type="text"], textarea, input[type="number"]').forEach(el => {
    el.value = '';
  });
  clone.querySelectorAll('input[type="file"]').forEach(el => {
    el.value = '';
  });
  clone.querySelectorAll('.setup-preview-imgs').forEach(p => p.innerHTML = '');
  clone.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {
    el.checked = false;
  });

  // Clear uploaded files
  clone._uploadedFiles = [];

  initSetupCard(clone, newIndex);
  setupCardsContainer.appendChild(clone);
}

if (setupCardsContainer) {
  const firstCard = setupCardsContainer.querySelector('.setup-card');
  if (firstCard) {
    initSetupCard(firstCard, 0);
    setupIndexCounter = 0;
  }

  if (addSetupBtn) {
    addSetupBtn.addEventListener('click', addSetupCard);
  }

  setupCardsContainer.addEventListener('click', e => {
    const btn = e.target.closest('.setup-remove-btn');
    if (!btn) return;
    const card = btn.closest('.setup-card');
    if (!card) return;

    const cards = setupCardsContainer.querySelectorAll('.setup-card');
    if (cards.length === 1) {
      card.querySelectorAll('input[type="text"], textarea, input[type="number"]').forEach(el => {
        el.value = '';
      });
      card.querySelectorAll('.setup-preview-imgs').forEach(p => p.innerHTML = '');
      card.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => {
        el.checked = false;
      });

      // Clear uploaded files
      card._uploadedFiles = [];

      initSetupCard(card, 0);
      return;
    }

    card.remove();
  });
}

/* ─────────────── DELETE EVENT CARDS ─────────────── */
// delete handled via API in myEventsContainer listener

/* ═══════════════ TOAST SYSTEM ═══════════════ */
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
