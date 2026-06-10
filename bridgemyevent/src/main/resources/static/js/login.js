

const loginUser = document.getElementById("loginUser");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const roleSelect = document.getElementById("loginRole"); // CLIENT / ORGANIZER / ADMIN
const errorBox = document.getElementById("errorBox");

loginUser.addEventListener("click", async function (e) {
    e.preventDefault();
    errorBox.innerText = "";

    const loginData = {
        email: emailInput.value.trim(),
        password: passwordInput.value.trim(),
        role: roleSelect.value
    };

    if (!loginData.email || !loginData.password || !loginData.role) {
        errorBox.innerText = "All fields are required";
        return;
    }

    try {
        // ================= LOGIN API =================
        const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData)
        });

        const loginDataRes = await loginRes.json();

        if (!loginRes.ok) {
            throw new Error(loginDataRes.message || "Login failed");
        }

        // 🔐 Save token
        localStorage.setItem("token", loginDataRes.token);
        localStorage.setItem("role", loginDataRes.role);

        // ================= INIT DASHBOARD =================
        const initRes = await fetch("/api/dashboard/init", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + loginDataRes.token
            }
        });

        const initData = await initRes.json();

        // 🚫 Organizer not approved
        if (initData.status === "LOCKED") {
            errorBox.innerText = initData.message || "Waiting for admin approval";
            setTimeout(() => {
                window.location.href = "/waiting-approval.html";
            }, 1500);
            return;
        }

        // ================= REDIRECT BY ROLE =================
        redirectByRole(initData.role || loginDataRes.role);


    } catch (error) {
        errorBox.innerText = "Login Error:" + error.message;
        console.error("Login Error:", error);
    }
});

// ================= REDIRECT FUNCTION =================
function redirectByRole(role) {
    const r = (role || "").toUpperCase();

    if (r === "CLIENT") {
        window.location.href = "/client.html";
    } 
    else if (r === "ORGANIZER") {
        window.location.href = "/organizer.html";
    } 
    else if (r === "ADMIN") {
        window.location.href = "/admin.html";
    } 
    else {
        console.error("Unknown role:", role);
        window.location.href = "/join.html";
    }
}

