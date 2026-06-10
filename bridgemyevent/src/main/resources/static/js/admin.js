const API_BASE = window.location.origin;
const DEFAULT_AVATAR = "./assets/default-pfp.png";

let selectedOrganizerId = null;
let dashboardData = null;
let allUsers = [];
let allEvents = [];
let allBookings = [];
let pendingOrganizers = [];
let analyticsData = null;
let earningsData = null;
let adminMonthlyTrendChart = null;
let adminYearlyTrendChart = null;
let adminEarningsMonthlyChart = null;
let adminEarningsYearlyChart = null;

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/join.html";
        return;
    }

    bindShellUi();
    initPaymentModeToggle();
    await refreshAdminData();
});

function bindShellUi() {
    const pages = document.querySelectorAll(".page");
    const sbLinks = document.querySelectorAll(".sb-link[data-page]");
    const titles = {
        dashboard: "Dashboard Overview",
        approvals: "Pending Approvals",
        users: "All Users",
        events: "All Events",
        bookings: "Bookings",
        reports: "Reports & Complaints",
        analytics: "Analytics",
        earnings: "Earnings",
        messages: "Contact Messages",
        settings: "Settings"
    };
    const subs = {
        dashboard: "Live platform snapshot",
        approvals: "Review organizer applications",
        users: "Manage clients, organizers, and admins",
        events: "Moderate all event listings",
        bookings: "Manage bookings, event status and payment details",
        reports: "Deferred for now",
        analytics: "Monthly, yearly and event frequency",
        earnings: "Platform revenue and fee statements",
        messages: "Deferred for now",
        settings: "Local admin preferences"
    };

    window.navigateTo = function (id) {
        pages.forEach(page => page.classList.remove("active"));
        sbLinks.forEach(link => link.classList.remove("active"));

        document.getElementById(`page-${id}`)?.classList.add("active");
        document.querySelector(`.sb-link[data-page="${id}"]`)?.classList.add("active");
        document.getElementById("pageTitle").textContent = titles[id] || id;
        document.getElementById("pageSub").textContent = subs[id] || "";

        if (window.innerWidth <= 768) {
            closeSb();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    sbLinks.forEach(link => link.addEventListener("click", () => window.navigateTo(link.dataset.page)));

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sbOverlay");
    const hamBtn = document.getElementById("hamBtn");

    function openSb() {
        sidebar?.classList.add("open");
        overlay?.classList.add("show");
    }

    function closeSb() {
        sidebar?.classList.remove("open");
        overlay?.classList.remove("show");
    }

    window.closeSb = closeSb;

    hamBtn?.addEventListener("click", () => sidebar?.classList.contains("open") ? closeSb() : openSb());
    overlay?.addEventListener("click", closeSb);

    const notifBtn = document.getElementById("notifBtn");
    const notifDd = document.getElementById("notifDd");
    notifBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        notifDd?.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
        if (notifDd && !notifDd.contains(e.target) && e.target !== notifBtn) {
            notifDd.classList.remove("show");
        }
    });

    document.querySelectorAll(".sm-item").forEach(item => {
        item.addEventListener("click", function () {
            document.querySelectorAll(".sm-item").forEach(node => node.classList.remove("active"));
            this.classList.add("active");
        });
    });

    document.getElementById("orgModal")?.addEventListener("click", function (e) {
        if (e.target === this) {
            closeModal();
        }
    });

    document.getElementById("globalSearch")?.addEventListener("input", handleGlobalSearch);
}

async function refreshAdminData() {
    try {
        const [dashboard, approvals, users, events, bookings, analytics, earnings] = await Promise.all([
            apiFetch("/admin/dashboard"),
            apiFetch("/admin/organizers/pending"),
            apiFetch("/admin/users"),
            apiFetch("/admin/events"),
            apiFetch("/admin/bookings"),
            apiFetch("/admin/analytics"),
            apiFetch("/admin/earnings")
        ]);

        dashboardData = dashboard;
        pendingOrganizers = approvals;
        allUsers = users;
        allEvents = events;
        allBookings = bookings;
        analyticsData = analytics;
        earningsData = earnings;

        renderDashboard();
        filterPendingOrganizers();
        filterUsers();
        filterEvents();
        filterBookings();
        renderAnalytics();
        renderEarnings();
    } catch (error) {
        alert(error.message || "Failed to load admin data");
    }
}

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem("token");
    
    const fetchOptions = {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };
    
    if (!fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET') {
        fetchOptions.cache = 'no-store';
    }

    const response = await fetch(`${API_BASE}${path}`, fetchOptions);

    if (response.status === 401 || response.status === 403) {
        logout(true);
        throw new Error("Session expired. Please login again.");
    }

    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;
    if (!response.ok) {
        throw new Error(data?.message || "Request failed");
    }
    return data;
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function renderDashboard() {
    if (!dashboardData) return;

    setText("dashboardTotalUsers", dashboardData.totalUsers);
    setText("dashboardTotalOrganizers", dashboardData.totalOrganizers);
    setText("dashboardOrganizerPendingText", `${dashboardData.pendingApprovals} pending`);
    setText("dashboardPendingApprovals", dashboardData.pendingApprovals);
    setText("dashboardTotalBookings", dashboardData.totalBookings);
    setText("dashboardPublishedEvents", dashboardData.publishedEvents);
    setText("dashboardHiddenEvents", dashboardData.hiddenEvents);
    setText("dashboardClients", dashboardData.totalClients);
    setText("dashboardFlaggedEvents", dashboardData.flaggedEvents);
    setText("dashboardActiveUsers", dashboardData.activeUsers);
    setText("dashboardSuspendedUsers", dashboardData.suspendedUsers);
    setText("dashboardTotalEvents", dashboardData.totalEvents);
    setText("analyticsUsers", dashboardData.totalUsers);
    setText("analyticsOrganizers", dashboardData.totalOrganizers);
    setText("analyticsEvents", dashboardData.totalEvents);
    setText("pendingApprovalsCount", dashboardData.pendingApprovals);
    setText("dashboardUsersSub", `${dashboardData.totalClients} clients and ${dashboardData.totalOrganizers} organizers`);

    renderRecentActivity(dashboardData.recentActivity || []);
    renderNotificationSummary();
}

function renderAnalytics() {
    if (!analyticsData) return;

    const monthFilter = document.getElementById("adminAnalyticsMonthYearFilter")?.value;
    const yearFilter = document.getElementById("adminAnalyticsYearFilter")?.value;

    let monthly = analyticsData.monthlyTrend || [];
    
    if (monthFilter) {
        monthly = monthly.filter(m => m.monthKey === monthFilter);
    } else if (yearFilter) {
        monthly = monthly.filter(m => m.monthKey && m.monthKey.startsWith(yearFilter));
    }

    renderTrendChart(
        "adminMonthlyTrendChart",
        monthly,
        "label",
        "count",
        "Monthly events"
    );
    renderTrendChart(
        "adminYearlyTrendChart",
        analyticsData.yearlyTrend || [],
        "year",
        "count",
        "Yearly events"
    );

    const body = document.getElementById("adminTopEventsBody");
    if (body) {
        const rows = Array.isArray(analyticsData.eventFrequency) ? analyticsData.eventFrequency : [];
        if (!rows.length) {
            body.innerHTML = emptyRow("No event frequency data found.", 2);
        } else {
            body.innerHTML = rows.map(item => `
                <tr><td>${escapeHtml(item.eventName || "-")}</td><td>${item.count ?? 0}</td></tr>
            `).join("");
        }
    }
}

function renderEarnings() {
    if (!earningsData) return;

    const monthFilter = document.getElementById("adminEarningsMonthYearFilter")?.value;
    const yearFilter = document.getElementById("adminEarningsYearFilter")?.value;

    let monthly = earningsData.monthlySummary || [];
    let statements = earningsData.statements || [];

    let rev = earningsData.totalGrossRevenue || 0;
    let adm = earningsData.totalAdminFees || 0;
    
    if (monthFilter) {
        monthly = monthly.filter(m => m.monthKey === monthFilter);
        statements = statements.filter(s => s.date && s.date.startsWith(monthFilter));
        rev = monthly.reduce((sum, m) => sum + (m.grossRevenue || 0), 0);
        adm = monthly.reduce((sum, m) => sum + (m.adminFees || 0), 0);
    } else if (yearFilter) {
        monthly = monthly.filter(m => m.monthKey && m.monthKey.startsWith(yearFilter));
        statements = statements.filter(s => s.date && s.date.startsWith(yearFilter));
        rev = monthly.reduce((sum, m) => sum + (m.grossRevenue || 0), 0);
        adm = monthly.reduce((sum, m) => sum + (m.adminFees || 0), 0);
    }

    setText("adminTotalGrossRevenue", formatPrice(rev));
    setText("adminTotalAdminFees", formatPrice(adm));
    setText("adminCompletedBookings", statements.length); // Adjusted logically if filtering statements

    renderDualTrendChart(
        "adminEarningsMonthlyChart",
        monthly,
        "label",
        "grossRevenue",
        "adminFees",
        "Gross Revenue",
        "Admin Fees"
    );
    renderDualTrendChart(
        "adminEarningsYearlyChart",
        earningsData.yearlySummary || [],
        "year",
        "grossRevenue",
        "adminFees",
        "Gross Revenue",
        "Admin Fees"
    );

    const body = document.getElementById("adminEarningsStatementsBody");
    if (body) {
        const rows = Array.isArray(statements) ? statements : [];
        if (!rows.length) {
            body.innerHTML = emptyRow("No earnings statements available.", 7);
        } else {
            body.innerHTML = rows.map(item => `
                <tr>
                  <td>${escapeHtml(item.date || "-")}</td>
                  <td>${escapeHtml(item.bookingId || "-")}</td>
                  <td>${escapeHtml(item.eventName || "-")}</td>
                  <td>${escapeHtml(item.organizerName || "-")}</td>
                  <td>${formatPrice(item.grossRevenue || 0)}</td>
                  <td>${formatPrice(item.adminFee || 0)}</td>
                  <td>${escapeHtml(titleCase(item.adminPaymentStatus || "-"))}</td>
                </tr>
            `).join("");
        }
    }
}

function renderTrendChart(canvasId, points, labelKey, valueKey, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const labels = points.map(point => String(point[labelKey] ?? "-"));
    const values = points.map(point => Number(point[valueKey] || 0));
    const chartConfig = {
        type: "line",
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderColor: "#2563EB",
                backgroundColor: "rgba(37,99,235,.2)",
                tension: 0.35,
                fill: true,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    };
    const chartMap = {
        adminMonthlyTrendChart,
        adminYearlyTrendChart
    };
    if (chartMap[canvasId]) chartMap[canvasId].destroy();
    const chart = new Chart(canvas, chartConfig);
    if (canvasId === "adminMonthlyTrendChart") adminMonthlyTrendChart = chart;
    if (canvasId === "adminYearlyTrendChart") adminYearlyTrendChart = chart;
}

function renderDualTrendChart(canvasId, points, labelKey, valueKeyA, valueKeyB, labelA, labelB) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return;
    const labels = points.map(point => String(point[labelKey] ?? "-"));
    const valuesA = points.map(point => Number(point[valueKeyA] || 0));
    const valuesB = points.map(point => Number(point[valueKeyB] || 0));
    const chartConfig = {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: labelA, data: valuesA, backgroundColor: "rgba(16,185,129,.7)", borderRadius: 6 },
                { label: labelB, data: valuesB, backgroundColor: "rgba(37,99,235,.7)", borderRadius: 6 }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: { y: { beginAtZero: true } }
        }
    };
    if (canvasId === "adminEarningsMonthlyChart" && adminEarningsMonthlyChart) adminEarningsMonthlyChart.destroy();
    if (canvasId === "adminEarningsYearlyChart" && adminEarningsYearlyChart) adminEarningsYearlyChart.destroy();
    const chart = new Chart(canvas, chartConfig);
    if (canvasId === "adminEarningsMonthlyChart") adminEarningsMonthlyChart = chart;
    if (canvasId === "adminEarningsYearlyChart") adminEarningsYearlyChart = chart;
}

function renderRecentActivity(items) {
    const feed = document.getElementById("recentActivityFeed");
    if (!feed) return;

    if (!items.length) {
        feed.innerHTML = `<div class="act-item"><div class="act-body"><div class="act-msg">No recent activity found.</div></div></div>`;
        return;
    }

    feed.innerHTML = items.map(item => `
        <div class="act-item">
          <div class="act-dot" style="background:${activityBg(item.status)};color:${activityColor(item.status)}"><i class="bi ${activityIcon(item.type, item.status)}"></i></div>
          <div class="act-body">
            <div class="act-msg"><strong>${escapeHtml(item.title || "-")}</strong></div>
            <div class="act-time"><i class="bi bi-clock" style="font-size:10px"></i> ${escapeHtml(item.time || "-")}</div>
          </div>
          <div class="act-meta">${statusBadge(item.status, true)}</div>
        </div>
    `).join("");
}

function renderNotificationSummary() {
    const box = document.getElementById("notifContent");
    if (!box || !dashboardData) return;
    box.innerHTML = `
      <div class="nd-icon" style="background:var(--amber-pale);color:var(--amber)"><i class="bi bi-hourglass-split"></i></div>
      <div style="flex:1">
        <div class="nd-text"><p><strong>${dashboardData.pendingApprovals}</strong> organizer approvals are waiting for review.</p></div>
        <div class="nd-time">${dashboardData.flaggedEvents} flagged event(s), ${dashboardData.suspendedUsers} suspended user(s)</div>
      </div>
    `;
}

function renderPendingOrganizers(list) {
    const tbody = document.getElementById("approvalsTbody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = emptyRow("No pending organizers found.", 6);
        return;
    }

    tbody.innerHTML = list.map(org => `
      <tr data-id="${org.userId}">
        <td>
          <div style="display:flex;align-items:center;gap:9px">
            <img src="${DEFAULT_AVATAR}" class="dt-avatar"/>
            <div>
              <div class="dt-name">${escapeHtml(org.companyName || org.fullName || "-")}</div>
              <div class="dt-sub">${escapeHtml(org.email || "-")}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(org.fullName || "-")}</td>
        <td>${escapeHtml(org.contactNumber || "-")}</td>
        <td>${escapeHtml(org.experience ? `${org.experience} years` : "-")}</td>
        <td style="font-size:12px;color:var(--txt-m)">${formatDate(org.createdAt)}</td>
        <td>
          <div class="actions-wrap">
            <button class="btn-approve" onclick="quickApproveOrganizer('${org.userId}')">Approve</button>
            <button class="btn-reject" onclick="quickRejectOrganizer('${org.userId}')">Reject</button>
            <button class="btn-ghost btn-sm" onclick="viewOrganizer('${org.userId}')"><i class="bi bi-eye"></i></button>
          </div>
        </td>
      </tr>
    `).join("");
}

function renderUsers(list) {
    const tbody = document.getElementById("usersTbody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = emptyRow("No users found.", 7);
        return;
    }

    tbody.innerHTML = list.map(user => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:9px">
            <img src="${user.profileImage || DEFAULT_AVATAR}" class="dt-avatar"/>
            <div>
              <div class="dt-name">${escapeHtml(user.fullName || "-")}</div>
              <div class="dt-sub">${escapeHtml(user.email || "-")}</div>
            </div>
          </div>
        </td>
        <td>${roleBadge(user.role)}</td>
        <td>${escapeHtml(user.city || "-")}</td>
        <td style="font-size:12px;color:var(--txt-m)">${formatDate(user.createdAt)}</td>
        <td style="font-weight:700">${user.bookingCount ?? 0}</td>
        <td>${statusBadge(user.status)}</td>
        <td><div class="actions-wrap">${userActions(user)}</div></td>
      </tr>
    `).join("");
}

function renderEvents(list) {
    const tbody = document.getElementById("eventsTbody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = emptyRow("No events found.", 8);
        return;
    }

    tbody.innerHTML = list.map(event => `
      <tr>
        <td><div class="dt-name">${escapeHtml(event.venueName || "-")}</div><div class="dt-sub">ID: ${escapeHtml(event.id || "-")}</div></td>
        <td>${escapeHtml(event.companyName || "-")}</td>
        <td>${escapeHtml((event.supportedEvents || [])[0] || "-")}</td>
        <td>${escapeHtml(event.city || event.location || "-")}</td>
        <td style="font-weight:700">${formatPrice(event.priceAmount)}</td>
        <td style="font-weight:700;color:var(--blue)">${event.bookingCount ?? 0}</td>
        <td>${eventStatusBadge(event.adminStatus)}</td>
        <td><div class="actions-wrap">${eventActions(event)}</div></td>
      </tr>
    `).join("");
}

function renderBookings(list) {
    const tbody = document.getElementById("bookingsTbody");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = emptyRow("No bookings found.", 10);
        return;
    }

    tbody.innerHTML = list.map(booking => `
      <tr>
        <td><div class="dt-name">${escapeHtml(booking.id || "-")}</div><div class="dt-sub">${escapeHtml(booking.eventId || "-")}</div></td>
        <td><div class="dt-name">${escapeHtml(booking.clientName || "-")}</div><div class="dt-sub">${escapeHtml(booking.clientEmail || "-")}</div></td>
        <td>${escapeHtml(booking.organizerName || "-")}</td>
        <td>${escapeHtml(booking.venueName || "-")}</td>
        <td>${booking.guests ?? "-"}</td>
        <td>${eventStatusBadge(booking.eventStatus)}</td>
        <td>${bookingStatusBadge(booking.status)}</td>
        <td>${booking.adminFeeAmount != null ? formatPrice(booking.adminFeeAmount) : "-"}${booking.adminPaymentStatus ? `<br><small style="color:var(--txt-m)">${titleCase(booking.adminPaymentStatus)}</small>` : ""}</td>
        <td><div class="actions-wrap">${bookingActions(booking)}</div></td>
      </tr>
    `).join("");
}

function bookingActions(booking) {
    const status = String(booking.status || "REQUESTED").toUpperCase();
    const actions = [`
        <button class="btn-ghost btn-sm" onclick="viewBooking('${booking.id}')"><i class="bi bi-eye"></i></button>`
    ];

    if (status === "REQUESTED") {
        actions.unshift(`<button class="btn-approve" onclick="changeBookingStatus('${booking.id}','CONFIRMED')">Confirm</button>`);
        actions.unshift(`<button class="btn-ban" onclick="changeBookingStatus('${booking.id}','CANCELLED')">Cancel</button>`);
    } else if (status === "CONFIRMED") {
        actions.unshift(`<button class="btn-warn" onclick="changeBookingStatus('${booking.id}','RUNNING')">Start</button>`);
        actions.unshift(`<button class="btn-ban" onclick="changeBookingStatus('${booking.id}','CANCELLED')">Cancel</button>`);
    } else if (status === "RUNNING") {
        actions.unshift(`<button class="btn-approve" onclick="changeBookingStatus('${booking.id}','COMPLETED')">Complete</button>`);
        actions.unshift(`<button class="btn-ban" onclick="changeBookingStatus('${booking.id}','CANCELLED')">Cancel</button>`);
    } else if (status === "COMPLETED") {
        const adminStatus = (booking.adminPaymentStatus || "").toUpperCase();
        if (adminStatus === "PENDING_PAYMENT") {
            actions.unshift(`<button class="btn-approve" onclick="completeAdminPayment('${booking.id}')">Mark Admin Paid</button>`);
        } else if (adminStatus === "AWAITING_CONFIRMATION") {
            actions.unshift(`<button class="btn-approve" onclick="completeAdminPayment('${booking.id}')">Confirm Admin Fee</button>`);
        } else {
            actions.unshift(`<button class="btn-ghost btn-sm" style="color:var(--txt-l)">Closed</button>`);
        }
    } else if (status === "CANCELLED") {
        actions.unshift(`<button class="btn-ghost btn-sm" style="color:var(--txt-l)">Cancelled</button>`);
    }

    actions.push(`<button class="btn-del" onclick="deleteBookingRecord('${booking.id}')">Delete</button>`);
    return actions.join("");
}

function userActions(user) {
    if ((user.role || "").toUpperCase() === "ADMIN") {
        return `<button class="btn-ghost btn-sm" style="color:var(--txt-l)">Protected</button>`;
    }

    const actions = [
        `<button class="btn-ghost btn-sm" onclick="viewUser('${user.id}')"><i class="bi bi-eye"></i></button>`
    ];

    if (!["ACTIVE", "APPROVED"].includes((user.status || "").toUpperCase())) {
        actions.unshift(`<button class="btn-approve" style="font-size:11px" onclick="changeUserStatus('${user.id}','ACTIVE')">Restore</button>`);
    } else {
        actions.unshift(`<button class="btn-warn" onclick="changeUserStatus('${user.id}','SUSPENDED')">Suspend</button>`);
    }

    actions.push(`<button class="btn-del" onclick="deleteUserRecord('${user.id}')">Delete</button>`);
    return actions.join("");
}


function eventActions(event) {
    const status = (event.adminStatus || "PUBLISHED").toUpperCase();
    const actions = [
        `<button class="btn-ghost btn-sm" onclick="viewEvent('${event.id}')"><i class="bi bi-eye"></i></button>`,
        `<button class="btn-del" onclick="deleteEventRecord('${event.id}')">Delete</button>`
    ];

    if (status === "PUBLISHED") {
        actions.unshift(`<button class="btn-hide" onclick="changeEventStatus('${event.id}','HIDDEN')">Hide</button>`);
        actions.unshift(`<button class="btn-warn" onclick="changeEventStatus('${event.id}','FLAGGED')">Flag</button>`);
    } else if (status === "HIDDEN") {
        actions.unshift(`<button class="btn-approve" style="font-size:11px" onclick="changeEventStatus('${event.id}','PUBLISHED')">Show</button>`);
    } else {
        actions.unshift(`<button class="btn-approve" style="font-size:11px" onclick="changeEventStatus('${event.id}','PUBLISHED')">Clear Flag</button>`);
        actions.unshift(`<button class="btn-hide" onclick="changeEventStatus('${event.id}','HIDDEN')">Hide</button>`);
    }

    return actions.join("");
}

async function viewBooking(id) {
    const data = await apiFetch(`/admin/bookings/${id}`);
    hideAllDetailPanels();
    setText("detailBookingId", data.id || "-");
    setText("detailBookingClient", data.clientName || "-");
    setText("detailBookingClientEmail", data.clientEmail || "-");
    setText("detailBookingClientPhone", data.clientPhone || "-");
    setText("detailBookingOrganizer", data.organizerName || "-");
    setText("detailBookingEvent", data.eventName || data.eventType || "-");
    setText("detailBookingVenue", data.venueName || "-");
    setText("detailBookingEventStatus", titleCase(data.eventStatus || "unknown"));
    setText("detailBookingStatus", titleCase(data.status || "REQUESTED"));
    setText("detailBookingGuests", data.guests != null ? `${data.guests}` : "-");
    setText("detailBookingPayment", titleCase(data.paymentStatus || "-") );
    setText("detailBookingTotal", data.totalAmountValue != null ? formatPrice(data.totalAmountValue) : (data.totalAmount ? escapeHtml(data.totalAmount) : "-"));
    setText("detailBookingDeposit", data.depositAmount != null ? formatPrice(data.depositAmount) : "-");
    setText("detailBookingAdminFee", data.adminFeeAmount != null ? formatPrice(data.adminFeeAmount) : "-");
    setText("detailBookingAdminPaymentStatus", titleCase(data.adminPaymentStatus || "-") );
    setText("detailBookingOrderId", data.lastOrderId || "-");
    setText("detailBookingMessage", data.message || "No message provided.");
    renderBookingSchedule("detailBookingSchedule", data.dateAndTime);
    renderBookingPaymentDetails("detailBookingPaymentDetails", data);
    openDetailPanel("bookingDetailPanel");
    navigateTo("bookings");
}

async function changeBookingStatus(id, status) {
    try {
        await apiFetch(`/admin/bookings/${id}/status/${status}`, { method: "PUT" });
        await refreshAdminData();
    } catch(err) {
        alert(err.message || "Failed to change booking status");
    }
}

async function completeAdminPayment(id) {
    if (confirm("Are you sure you want to mark this booking as paid?")) {
        try {
            await apiFetch(`/admin/bookings/${id}/admin-payment/complete`, { method: "PUT" });
            await refreshAdminData();
        } catch(err) {
            alert(err.message || "Failed to complete admin payment");
        }
    }
}

async function deleteBookingRecord(id) {
    if (!window.confirm("Delete this booking permanently?")) return;
    try {
        await apiFetch(`/admin/bookings/${id}`, { method: "DELETE" });
        await refreshAdminData();
    } catch(err) {
        alert(err.message || "Failed to delete booking");
    }
}

function renderBookingSchedule(containerId, schedule) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!Array.isArray(schedule) || !schedule.length) {
        container.innerHTML = `<span class="detail-value">No schedule information available.</span>`;
        return;
    }
    container.innerHTML = schedule.map(entry => {
        const date = escapeHtml(entry.date || "-");
        const from = escapeHtml(entry.timeFrom || "-");
        const to = escapeHtml(entry.timeTo || "-");
        return `<span class="amenity-chip"><strong>${date}</strong><br>${from}${to && to !== "-" ? ` - ${to}` : ""}</span>`;
    }).join("");
}

function renderBookingPaymentDetails(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const paid = data.paidAmount != null ? formatPrice(data.paidAmount) : "-";
    const total = data.totalAmountValue != null ? formatPrice(data.totalAmountValue) : (data.totalAmount ? escapeHtml(data.totalAmount) : "-");
    container.innerHTML = `
      <div><strong>Paid:</strong> ${paid}</div>
      <div><strong>Total:</strong> ${total}</div>
      <div><strong>Admin Fee:</strong> ${data.adminFeeAmount != null ? formatPrice(data.adminFeeAmount) : "-"}</div>
      <div><strong>Admin Payment:</strong> ${escapeHtml(titleCase(data.adminPaymentStatus || "-"))}</div>
      <div><strong>Currency:</strong> ${escapeHtml(data.paymentCurrency || "-")}</div>
      <div><strong>Last Stage:</strong> ${escapeHtml(data.lastPaymentStage || "-")}</div>
      <div><strong>Payment ID:</strong> ${escapeHtml(data.lastPaymentId || "-")}</div>
    `;
}

function bookingStatusBadge(status) {
    const normalized = String(status || "REQUESTED").toUpperCase();
    if (normalized === "REQUESTED") return `<span class="bdg bdg-pending">Requested</span>`;
    if (normalized === "CONFIRMED") return `<span class="bdg bdg-active">Confirmed</span>`;
    if (normalized === "RUNNING") return `<span class="bdg bdg-open">Running</span>`;
    if (normalized === "COMPLETED") return `<span class="bdg bdg-approved">Completed</span>`;
    if (normalized === "CANCELLED") return `<span class="bdg bdg-banned">Cancelled</span>`;
    return `<span class="bdg bdg-open">${escapeHtml(titleCase(normalized))}</span>`;
}

async function viewOrganizer(id) {
    selectedOrganizerId = id;
    const data = await apiFetch(`/admin/organizer/${id}`);
    hideAllDetailPanels();
    setText("detailOrgName", data.fullName || "-");
    setText("detailOrgCompany", data.companyName || "-");
    setText("detailOrgEmail", data.email || "-");
    setText("detailOrgStatus", titleCase(data.status || "-"));
    setText("detailOrgJoined", formatDate(data.createdAt));
    setText("detailOrgPhone", data.contactNumber || "-");
    setText("detailOrgCityState", [data.city, data.state].filter(Boolean).join(", ") || "-");
    setText("detailOrgApproval", titleCase(data.approvalStatus || data.status || "-"));
    setText("detailOrgExperience", data.experience ? `${data.experience} years` : "-");
    setText("detailOrgGst", data.gst || "-");
    setText("detailOrgRating", data.rating != null ? `${data.rating.toFixed ? data.rating.toFixed(1) : data.rating} ★` : "-");
    setText("detailOrgReviews", data.reviewCount != null ? `${data.reviewCount} reviews` : (data.reviews ? `${data.reviews.length} reviews` : "-"));
    setText("detailOrgEventTypes", formatArray(data.events));
    renderNumberedLocationBlocks("detailOrgLocations", data.locations);
    setText("detailOrgPortfolio", formatArray(data.portfolio));
    setText("detailOrgAbout", data.about || "-");
    setText("detailOrgInstagram", data.instagram || "-");
    setText("detailOrgFacebook", data.facebook || "-");
    setText("detailOrgYoutube", data.youTube || "-");
    setText("detailOrgWebsite", data.website || "-");
    setText("detailOrgDescription", data.description || "-");

    const detailOrgImg = document.getElementById("detailOrgImage");
    if (detailOrgImg) {
        detailOrgImg.src = data.profileImage || DEFAULT_AVATAR;
    }

    openDetailPanel("organizerDetailPanel");
    navigateTo("approvals");
}

async function approveFromModal() {
    if (!selectedOrganizerId) return;
    await quickApproveOrganizer(selectedOrganizerId);
    closeModal();
}

async function rejectFromModal() {
    if (!selectedOrganizerId) return;
    await quickRejectOrganizer(selectedOrganizerId);
    closeModal();
}

async function quickApproveOrganizer(id) {
    try {
        await apiFetch(`/admin/organizer/${id}/approve`, { method: "PUT" });
        await refreshAdminData();
    } catch (err) {
        alert(err.message || "Failed to approve organizer");
    }
}

async function quickRejectOrganizer(id) {
    try {
        await apiFetch(`/admin/organizer/${id}/reject`, { method: "PUT" });
        await refreshAdminData();
    } catch (err) {
        alert(err.message || "Failed to reject organizer");
    }
}

async function changeUserStatus(id, status) {
    try {
        await apiFetch(`/admin/users/${id}/status/${status}`, { method: "PUT" });
        await refreshAdminData();
    } catch (err) {
        alert(err.message || "Failed to update user status");
    }
}

async function deleteUserRecord(id) {
    if (!window.confirm("Delete this user? This also removes their linked profile.")) return;
    try {
        await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
        await refreshAdminData();
    } catch (err) {
        alert(err.message || "Failed to delete user");
    }
}

async function changeEventStatus(id, status) {
    try {
        await apiFetch(`/admin/events/${id}/status/${status}`, { method: "PUT" });
        await refreshAdminData();
    } catch (err) {
        alert(err.message || "Failed to update event status");
    }
}

async function deleteEventRecord(id) {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
        await apiFetch(`/admin/events/${id}`, { method: "DELETE" });
        await refreshAdminData();
    } catch (err) {
        alert(err.message || "Failed to delete event");
    }
}

async function viewUser(id) {
    const data = await apiFetch(`/admin/users/${id}`);
    hideAllDetailPanels();
    setText("detailUserName", data.fullName || "-");
    setText("detailUserEmail", data.email || "-");
    setText("detailUserRole", titleCase(data.role || "-"));
    setText("detailUserStatus", titleCase(data.status || "-"));
    setText("detailUserJoined", formatDate(data.createdAt));
    setText("detailUserPhone", data.phone || data.contactNumber || "-");
    setText("detailUserCompany", data.companyName || "-");
    setText("detailUserExperience", data.experience ? `${data.experience} years` : "-");
    setText("detailUserGst", data.gst || "-");
    setText("detailUserRating", data.rating != null ? `${data.rating.toFixed ? data.rating.toFixed(1) : data.rating} ★` : "-");
    setText("detailUserReviews", data.reviewCount != null ? `${data.reviewCount} reviews` : "-");
    setText("detailUserPhone", data.phone || data.contactNumber || "-");
    setText("detailUserCityState", [data.city, data.state].filter(Boolean).join(", ") || "-");
    setText("detailUserBookings", data.bookingCount ?? 0);
    setText("detailUserType", titleCase(data.profileType || "-"));
    setText("detailUserEvents", formatArray(data.events));
    renderNumberedLocationBlocks("detailUserLocations", data.locations);
    setText("detailUserAbout", data.about || "-");
    setText("detailUserDescription", data.description || "-");
    const isOrganizer = String(data.role || data.profileType || "").toUpperCase() === "ORGANIZER";
    document.querySelectorAll(".organizer-only").forEach(el => el.style.display = isOrganizer ? "" : "none");
    const img = document.getElementById("detailUserImage");
    if (img) img.src = data.profileImage || DEFAULT_AVATAR;
    openDetailPanel("userDetailPanel");
    navigateTo("users");
}

async function viewEvent(id) {
    const data = await apiFetch(`/admin/events/${id}`);
    hideAllDetailPanels();
    setText("detailEventName", data.venueName || "-");
    setText("detailEventOrganizer", data.companyName || "-");
    setText("detailEventStatus", titleCase(data.adminStatus || "-"));
    setText("detailEventVenue", data.venueName || "-");
    setText("detailEventLocation", [data.city, data.location].filter(Boolean).join(", ") || "-");
    setText("detailEventPhone", data.contactNumber || "-");
    setText("detailEventCategory", formatArray(data.supportedEvents) || titleCase(data.venueType || "-"));
    setText("detailEventPrice", `${formatPrice(data.priceAmount)}${data.priceUnit ? ` / ${escapeHtml(data.priceUnit)}` : ""}`);
    const capacity = [data.minCapacity, data.maxCapacity].filter(Boolean).join(" - ");
    setText("detailEventCapacity", capacity ? `${capacity} guests` : "-");
    setText("detailEventBookings", data.bookingCount ?? 0);
    setText("detailEventDescription", data.description || "-");
    renderChips("detailEventAmenities", data.amenities);
    renderChips("detailEventSupported", data.supportedEvents);
    renderAvailabilityChips("detailEventAvailability", data.availabilityData, data.availabilityDataType);
    renderEventGallery(data);
    renderEventSetups(data.setups || []);
    openDetailPanel("eventDetailPanel");
    navigateTo("events");
}

function renderChips(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
        container.innerHTML = `<span class="detail-value">-</span>`;
        return;
    }
    container.innerHTML = items.map(item => `<span class="amenity-chip">${escapeHtml(String(item))}</span>`).join("");
}

function renderAvailabilityChips(containerId, availabilityData, availabilityType) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!Array.isArray(availabilityData) || !availabilityData.length) {
        if (availabilityType) {
            container.innerHTML = `<span class="detail-value">${escapeHtml(String(availabilityType))}</span>`;
            return;
        }
        container.innerHTML = `<span class="detail-value">-</span>`;
        return;
    }
    container.innerHTML = availabilityData.map(item => {
        const date = escapeHtml(item.date || "-");
        const from = escapeHtml(item.timeFrom || item.from || "-");
        const to = escapeHtml(item.timeTo || item.to || "-");
        return `
            <span class="amenity-chip availability-chip">
              <i class="bi bi-calendar-event"></i>
              ${date} ${from && from !== "-" ? `| ${from}` : ""}${to && to !== "-" ? ` - ${to}` : ""}
            </span>`;
    }).join("");
    if (availabilityType) {
        container.innerHTML = `<div class="detail-label" style="margin-bottom:10px">${escapeHtml(String(availabilityType))}</div>` + container.innerHTML;
    }
}

function renderEventGallery(event) {
    const galleryMain = document.getElementById("detailEventGalleryMain");
    const thumbContainer = document.getElementById("detailEventGalleryThumbs");
    const toggle = document.getElementById("detailEventGalleryToggle");
    const expanded = document.getElementById("detailEventGalleryExpanded");
    if (!galleryMain || !thumbContainer || !toggle || !expanded) return;

    const allImages = (event.setups || [])
        .flatMap(setup => Array.isArray(setup.images) ? setup.images.filter(Boolean) : [])
        .filter(Boolean);
    const defaultImages = ["./assets/IMG-20251005-WA0001.jpg"];
    const images = allImages.length ? allImages : defaultImages;

    galleryMain.src = images[0];
    galleryMain.alt = `${escapeHtml(event.venueName || "Event")} photo 1`;
    thumbContainer.innerHTML = images.map((src, index) => `
        <div class="gallery-thumb${index === 0 ? " active" : ""}" data-src="${escapeHtml(src)}" aria-label="Photo ${index + 1}">
          <img src="${escapeHtml(src)}" alt="Photo ${index + 1}" />
        </div>
    `).join("");
    thumbContainer.querySelectorAll(".gallery-thumb").forEach((thumb, index) => {
        thumb.addEventListener("click", () => {
            galleryMain.src = thumb.dataset.src || images[index];
            galleryMain.alt = `${escapeHtml(event.venueName || "Event")} photo ${index + 1}`;
            thumbContainer.querySelectorAll(".gallery-thumb").forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
        });
    });

    if (images.length > 3) {
        toggle.classList.remove("hidden");
        toggle.textContent = `See all ${images.length} photos`;
        expanded.innerHTML = images.map((src, index) => `
            <img class="gallery-expanded-thumb" src="${escapeHtml(src)}" alt="Photo ${index + 1}" />
        `).join("");
        expanded.classList.add("hidden");
        toggle.onclick = () => {
            const isHidden = expanded.classList.toggle("hidden");
            toggle.textContent = isHidden ? `See all ${images.length} photos` : `Hide photos`;
        };
    } else {
        toggle.classList.add("hidden");
        expanded.classList.add("hidden");
        expanded.innerHTML = "";
    }
}

function renderEventSetups(setups) {
    const container = document.getElementById("detailEventSetupList");
    if (!container) return;
    if (!Array.isArray(setups) || !setups.length) {
        container.innerHTML = `<div class="detail-value">No setup details available.</div>`;
        return;
    }

    container.innerHTML = setups.map(setup => {
        const setupImage = Array.isArray(setup.images) && setup.images.length ? setup.images[0] : "./assets/IMG-20251005-WA0001.jpg";
        const hasGallery = Array.isArray(setup.images) && setup.images.length > 1;
        const priceText = setup.priceConditions === "included"
            ? "Included in base price"
            : setup.priceConditions === "additional"
                ? setup.setupPrice ? `₹${escapeHtml(String(setup.setupPrice))}${setup.pricePer ? ` / ${escapeHtml(String(setup.pricePer))}` : ""}` : "Price on request"
                : "Price on request";
        const availabilityText = setup.availability === "Available" ? "Available" : setup.availability === "On Request" ? "On Request" : "Not Available";
        const imagesMarkup = hasGallery ? setup.images.map((src, index) => `
            <img class="setup-image-thumb" src="${escapeHtml(src)}" alt="${escapeHtml(setup.setupName || "Setup")} ${index + 1}" />
        `).join("") : "";

        return `
            <div class="setup-item-horizontal">
              <img class="setup-img" src="${escapeHtml(setupImage)}" alt="${escapeHtml(setup.setupName || "Setup image")}" />
              <div class="setup-card-body">
                <div class="setup-top">
                  <div><div class="setup-name">${escapeHtml(setup.setupName || "Setup")}</div></div>
                  <div><span class="setup-price-tag">${escapeHtml(priceText)}</span></div>
                </div>
                <div class="setup-bottom">
                  <span class="setup-avail ${availabilityText === "Available" ? "avail-yes" : availabilityText === "On Request" ? "avail-warn" : "avail-no"}">
                    <i class="bi ${availabilityText === "Available" ? "bi-check-circle-fill" : availabilityText === "On Request" ? "bi-clock-fill" : "bi-x-circle-fill"}"></i>
                    <div class="setup-avail-text">${escapeHtml(availabilityText)}</div>
                  </span>
                </div>
                <div class="setup-desc"><span style="font-weight:600;color:var(--txt-h)">Description:</span><div>${escapeHtml(setup.setupDescription || "-")}</div></div>
                ${hasGallery ? `<button type="button" class="btn-ghost btn-sm setup-gallery-toggle">See all ${setup.images.length}</button><div class="setup-images-grid hidden">${imagesMarkup}</div>` : ""}
              </div>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".setup-gallery-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const grid = button.nextElementSibling;
            if (!grid) return;
            const isHidden = grid.classList.toggle("hidden");
            button.textContent = isHidden ? button.textContent.replace(/Hide photos|Hide images/, `See all ${grid.querySelectorAll("img").length}`) : "Hide images";
        });
    });
}

function hideAllDetailPanels() {
    document.querySelectorAll(".detail-card").forEach(panel => panel.classList.add("hidden"));
}

function openDetailPanel(id) {
    hideAllDetailPanels();
    document.getElementById(id)?.classList.remove("hidden");
}

function closeDetailPanel(id) {
    document.getElementById(id)?.classList.add("hidden");
}

function formatArray(value) {
    if (value == null) return "-";
    if (Array.isArray(value)) {
        if (!value.length) return "-";
        return value.map(item => escapeHtml(String(item))).join(", ");
    }
    if (typeof value === "object") {
        return escapeHtml(JSON.stringify(value));
    }
    return escapeHtml(String(value));
}

function handleGlobalSearch(event) {
    const value = (event.target.value || "").trim().toLowerCase();
    if (!value) {
        renderUsers(allUsers);
        renderEvents(allEvents);
        renderBookings(allBookings);
        return;
    }

    renderUsers(allUsers.filter(user =>
        [user.fullName, user.email, user.city, user.role, user.status]
            .filter(Boolean)
            .some(field => String(field).toLowerCase().includes(value))
    ));

    renderEvents(allEvents.filter(item =>
        [item.venueName, item.companyName, item.city, item.location, item.adminStatus]
            .filter(Boolean)
            .some(field => String(field).toLowerCase().includes(value))
    ));

    renderBookings(allBookings.filter(booking =>
        [booking.id, booking.clientName, booking.clientEmail, booking.organizerName, booking.eventName, booking.venueName, booking.status, booking.eventStatus, booking.eventType]
            .filter(Boolean)
            .some(field => String(field).toLowerCase().includes(value))
    ));
}

function closeModal() {
    document.getElementById("orgModal")?.classList.remove("show");
}

function logout(force = false) {
    if (!force && !confirm("Are you sure you want to log out?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/join.html";
}

function initPaymentModeToggle() {
    const toggle = document.getElementById("paymentModeToggle");
    const label = document.getElementById("paymentModeLabel");
    if (!toggle || !label) return;

    const stored = (localStorage.getItem("paymentMode") || "fake").toLowerCase();
    toggle.checked = stored === "real";
    label.textContent = toggle.checked ? "Real" : "Fake";

    toggle.addEventListener("change", () => {
        const mode = toggle.checked ? "real" : "fake";
        localStorage.setItem("paymentMode", mode);
        label.textContent = toggle.checked ? "Real" : "Fake";
    });
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value ?? "";
    }
}

function renderNumberedLocationBlocks(id, locations) {
    const element = document.getElementById(id);
    if (!element) return;

    if (!Array.isArray(locations) || locations.length === 0) {
        element.textContent = "-";
        return;
    }

    element.innerHTML = locations.map((location, index) => `
        <div class="location-chip">
            <span class="location-index">${index + 1}</span>
            <span class="location-text">${escapeHtml(location || "-")}</span>
        </div>
    `).join("");
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return value;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatPrice(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

function emptyRow(message, colspan) {
    return `<tr><td colspan="${colspan}" style="text-align:center;color:var(--txt-m);padding:20px">${escapeHtml(message)}</td></tr>`;
}

function roleBadge(role) {
    const normalized = String(role || "").toUpperCase();
    if (normalized === "ORGANIZER") return `<span class="bdg bdg-organizer">Organizer</span>`;
    if (normalized === "ADMIN") return `<span class="bdg bdg-admin"><i class="bi bi-shield-fill"></i> Admin</span>`;
    return `<span class="bdg bdg-user">Client</span>`;
}

function statusBadge(status, compact = false) {
    const normalized = String(status || "").toUpperCase();
    if (["ACTIVE", "APPROVED"].includes(normalized)) return `<span class="bdg bdg-active"><i class="bi bi-circle-fill" style="font-size:7px"></i> ${compact ? normalized : titleCase(normalized)}</span>`;
    if (normalized === "PENDING") return `<span class="bdg bdg-pending"><i class="bi bi-hourglass-split"></i> Pending</span>`;
    if (normalized === "SUSPENDED") return `<span class="bdg bdg-pending"><i class="bi bi-pause-circle-fill"></i> Suspended</span>`;
    if (normalized === "REJECTED") return `<span class="bdg bdg-rejected"><i class="bi bi-x-circle-fill"></i> Rejected</span>`;
    if (normalized === "DELETED") return `<span class="bdg bdg-banned"><i class="bi bi-trash-fill"></i> Deleted</span>`;
    return `<span class="bdg bdg-open">${escapeHtml(titleCase(normalized || "-"))}</span>`;
}

function eventStatusBadge(status) {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "PUBLISHED") return `<span class="bdg bdg-active"><i class="bi bi-circle-fill" style="font-size:7px"></i> Published</span>`;
    if (normalized === "HIDDEN") return `<span class="bdg bdg-hidden"><i class="bi bi-eye-slash-fill"></i> Hidden</span>`;
    if (normalized === "FLAGGED") return `<span class="bdg bdg-flagged"><i class="bi bi-flag-fill"></i> Flagged</span>`;
    if (normalized === "DELETED") return `<span class="bdg bdg-flagged"><i class="bi bi-trash-fill"></i> Deleted</span>`;
    return `<span class="bdg bdg-open">${escapeHtml(titleCase(normalized || "-"))}</span>`;
}

function titleCase(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function activityIcon(type, status) {
    if (type === "event") return "bi-calendar-event-fill";
    if (["APPROVED", "ACTIVE"].includes(String(status).toUpperCase())) return "bi-check-circle-fill";
    if (String(status).toUpperCase() === "PENDING") return "bi-hourglass-split";
    return "bi-person-plus-fill";
}

function activityBg(status) {
    const normalized = String(status || "").toUpperCase();
    if (["APPROVED", "ACTIVE"].includes(normalized)) return "var(--green-pale)";
    if (normalized === "FLAGGED" || normalized === "BANNED") return "var(--red-pale)";
    return "var(--amber-pale)";
}

function activityColor(status) {
    const normalized = String(status || "").toUpperCase();
    if (["APPROVED", "ACTIVE"].includes(normalized)) return "var(--green)";
    if (normalized === "FLAGGED" || normalized === "BANNED") return "var(--red)";
    return "var(--amber)";
}

window.refreshAdminData = refreshAdminData;
window.viewOrganizer = viewOrganizer;
window.closeModal = closeModal;
window.closeDetailPanel = closeDetailPanel;
window.approveFromModal = approveFromModal;
window.rejectFromModal = rejectFromModal;
window.quickApproveOrganizer = quickApproveOrganizer;
window.quickRejectOrganizer = quickRejectOrganizer;
window.changeUserStatus = changeUserStatus;
window.deleteUserRecord = deleteUserRecord;
window.changeEventStatus = changeEventStatus;
window.deleteEventRecord = deleteEventRecord;
window.viewEvent = viewEvent;
window.logout = logout;

// --- Filtering Logic ---

document.getElementById("approvalsSearch")?.addEventListener("input", filterPendingOrganizers);
document.getElementById("usersSearch")?.addEventListener("input", filterUsers);
document.getElementById("usersRoleFilter")?.addEventListener("change", filterUsers);
document.getElementById("eventsSearch")?.addEventListener("input", filterEvents);
document.getElementById("adminBookingsSearch")?.addEventListener("input", filterBookings);
document.getElementById("adminBookingsSpecificDate")?.addEventListener("change", filterBookings);
document.getElementById("adminBookingsAdminFeeFilter")?.addEventListener("change", filterBookings);

document.getElementById("adminAnalyticsMonthYearFilter")?.addEventListener("change", renderAnalytics);
document.getElementById("adminAnalyticsYearFilter")?.addEventListener("input", renderAnalytics);
document.getElementById("adminAnalyticsFilterClear")?.addEventListener("click", () => {
    const m = document.getElementById("adminAnalyticsMonthYearFilter");
    const y = document.getElementById("adminAnalyticsYearFilter");
    if (m) m.value = "";
    if (y) y.value = "";
    renderAnalytics();
});

document.getElementById("adminEarningsMonthYearFilter")?.addEventListener("change", renderEarnings);
document.getElementById("adminEarningsYearFilter")?.addEventListener("input", renderEarnings);
document.getElementById("adminEarningsFilterClear")?.addEventListener("click", () => {
    const m = document.getElementById("adminEarningsMonthYearFilter");
    const y = document.getElementById("adminEarningsYearFilter");
    if (m) m.value = "";
    if (y) y.value = "";
    renderEarnings();
});

function filterPendingOrganizers() {
    const q = (document.getElementById("approvalsSearch")?.value || "").toLowerCase();
    let filtered = pendingOrganizers;
    if (q) {
        filtered = filtered.filter(org => 
            [org.fullName, org.companyName, org.email, org.city, org.state]
                .filter(Boolean)
                .some(val => String(val).toLowerCase().includes(q))
        );
    }
    renderPendingOrganizers(filtered);
}

function filterUsers() {
    const q = (document.getElementById("usersSearch")?.value || "").toLowerCase();
    const role = document.getElementById("usersRoleFilter")?.value || "ALL";
    let filtered = allUsers;
    
    if (q) {
        filtered = filtered.filter(u => 
            [u.fullName, u.email, u.city, u.role, u.status]
                .filter(Boolean)
                .some(val => String(val).toLowerCase().includes(q))
        );
    }
    if (role !== "ALL") {
        filtered = filtered.filter(u => (u.role || "").toUpperCase() === role);
    }
    renderUsers(filtered);
}

function filterEvents() {
    const q = (document.getElementById("eventsSearch")?.value || "").toLowerCase();
    let filtered = allEvents;
    if (q) {
        filtered = filtered.filter(e => 
            [e.venueName, e.companyName, e.city, e.location, e.adminStatus]
                .filter(Boolean)
                .some(val => String(val).toLowerCase().includes(q))
        );
    }
    renderEvents(filtered);
}

function filterBookings() {
    const q = (document.getElementById("adminBookingsSearch")?.value || "").toLowerCase();
    const dateQuery = document.getElementById("adminBookingsSpecificDate")?.value;
    const feeFilter = document.getElementById("adminBookingsAdminFeeFilter")?.value || "ALL";

    let filtered = allBookings;

    if (q) {
        filtered = filtered.filter(b => 
            [b.id, b.clientName, b.clientEmail, b.organizerName, b.eventName, b.venueName, b.status, b.eventStatus]
                .filter(Boolean)
                .some(val => String(val).toLowerCase().includes(q))
        );
    }

    if (feeFilter !== "ALL") {
        filtered = filtered.filter(b => (b.adminPaymentStatus || "").toUpperCase() === feeFilter);
    }

    if (dateQuery) {
        filtered = filtered.filter(b => {
            const slot = (b.dateAndTime || [])[0] || {};
            if (!slot.date) return false;
            try {
                const bDate = new Date(slot.date);
                const sDate = new Date(dateQuery);
                if (!isNaN(bDate) && !isNaN(sDate)) {
                    return bDate.toISOString().split("T")[0] === sDate.toISOString().split("T")[0];
                }
            } catch(e){}
            return false;
        });
    }

    renderBookings(filtered);
}
