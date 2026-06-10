document
  .getElementById("clientRegister")
  .addEventListener("click", function (e) {

    e.preventDefault();

    const errorElement = document.getElementById("clientError");
    const fullName = document.getElementById("clientFullName").value.trim();
    const email = document.getElementById("clientEmail").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const userName = document.getElementById("clientUserName").value.trim();
    const password = document.getElementById("clientPassword").value.trim();
    const confirmPassword = document.getElementById("clientConfirmPassword").value.trim();

    if (!fullName || !email || !phone || !userName || !password || !confirmPassword) {
      errorElement.innerText = "All fields are required";
      return;
    }

    if (password.length < 6) {
      errorElement.innerText = "Password must be at least 6 characters";
      return;
    }

    if (password !== confirmPassword) {
      errorElement.innerText = "Passwords do not match";
      return;
    }

    const data = {
      fullName: fullName,
      userName: userName,
      email: email,
      phone: phone,
      password: password
    };

    fetch("/api/auth/register/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    .then(res => res.text())
    .then(msg => {
      alert(msg);
      window.location.href = "/join.html";
    })
    .catch(err => console.error(err));
});




document.getElementById("organizerRegister").addEventListener("click", function(e) {
  e.preventDefault();

  const events = [];
  document.querySelectorAll("input[name='organizerEvents[]']:checked")
    .forEach(cb => events.push(cb.value));
  
  const locationsArray = [];
  document
    .querySelectorAll("input[name='organizerLocation[]']")
    .forEach(cb => locationsArray.push(cb.value));

  const errorElement = document.getElementById("orgError");
  const fullName = document.getElementById("organizerFullName").value.trim();
  const experience = document.getElementById("organizerExperience").value.trim();
  const email = document.getElementById("organizerEmail").value.trim();
  const gst = document.getElementById("organizerGST").value.trim();
  const password = document.getElementById("organizerPassword").value.trim();
  const confirmPassword = document.getElementById("orgConfirmPassword").value.trim();
  const companyName = document.getElementById("organizerCompanyName").value.trim();
  const description = document.getElementById("organizerDescription").value.trim();
  const about = document.getElementById("organizerAbout").value.trim();
  const phone = document.getElementById("organizerPhone").value.trim();

  if (!fullName || !email || !password || !confirmPassword || !companyName || !description || !about || events.length === 0 || locationsArray.length === 0 || !phone || !experience || !gst) {
    errorElement.innerText = "All fields are required";
    return;
  }

  if (password.length < 6) {
    errorElement.innerText = "Password must be at least 6 characters";
    return;
  }

  if (password !== confirmPassword) {
    errorElement.innerText = "Passwords do not match";
    return;
  }
  
  
  const organizerData = {
      fullName: fullName,
      companyName: companyName,
      events: events,
      experience: experience,
      description: description,
      about: about,
      gst: gst,
      locations: locationsArray,
      contactNumber: phone,
      email: email,
      password: password
  };
  
  fetch("/api/auth/register/organizer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(organizerData)
  })
  .then(res => res.text())
    .then(msg => {
      alert(msg);
      window.location.href = "/join.html";
    })
    .catch(err => console.error(err));
});

