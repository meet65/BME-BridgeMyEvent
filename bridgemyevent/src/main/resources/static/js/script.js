 // Handle review form submission
 document.getElementById('sendReviewBtn').addEventListener('click', function() {
  const reviewerName = document.getElementById('reviewerName').value.trim();
  const reviewText = document.getElementById('reviewText').value.trim();
  
  if (!reviewerName || !reviewText) {
    alert('Please fill in all fields');
    return;
  }
  

  alert('Thank you for your review! Your feedback has been submitted.');
  
  // Reset form
  document.getElementById('reviewForm').reset();
  document.getElementById('addReviewModal').reset();
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('addReviewModal'));
  modal.hide();
  
  // addReviewToCarousel(reviewerName, reviewText);
});


function addReviewToCarousel(name, text) {
  const carouselInner = document.getElementById('review-sub-card');
  const carouselIndicators = document.querySelector('#carouselExampleDark .carousel-indicators');
  
  // Create new carousel item
  const newItem = document.createElement('div');
  newItem.className = 'review carousel-item';
  newItem.innerHTML = `
    <div style="max-width: 18rem;">
      <div class="person">
        <img class="person-img" src="./assets/person-img.jpg" alt="person">
        <h2>${name}</h2>
      </div>
      <p>"${text}"</p>
    </div>
  `;
  
  // Add to carousel
  carouselInner.appendChild(newItem);
  
  // Add new indicator
  const indicatorCount = carouselIndicators.children.length;
  const newIndicator = document.createElement('button');
  newIndicator.type = 'button';
  newIndicator.setAttribute('data-bs-target', '#carouselExampleDark');
  newIndicator.setAttribute('data-bs-slide-to', indicatorCount);
  newIndicator.setAttribute('aria-label', `Slide ${indicatorCount + 1}`);
  carouselIndicators.appendChild(newIndicator);
}


// Handle organizer card clicks and header styling
document.addEventListener('DOMContentLoaded', function() {
  const organizerCards = document.querySelectorAll('.organizer-card');
  const organizerModal = document.getElementById('organizerModal');
  const modalInstance = new bootstrap.Modal(organizerModal);
  const header = document.getElementById('nav-main');
  
  // Function to update header when modal opens/closes
  function updateHeaderOnModalChange() {
    if (organizerModal.classList.contains('show')) {
      header.classList.add('modal-open');
    } else {
      header.classList.remove('modal-open');
    }
  }
  
  // Listen for modal show event
  organizerModal.addEventListener('show.bs.modal', function() {
    header.classList.add('modal-open');
  });
  
  // Listen for modal hide event
  organizerModal.addEventListener('hide.bs.modal', function() {
    header.classList.remove('modal-open');
  });
  
  // Listen for modal shown event (after animation)
  organizerModal.addEventListener('shown.bs.modal', function() {
    updateHeaderOnModalChange();
  });
  
  // Listen for modal hidden event (after animation)
  organizerModal.addEventListener('hidden.bs.modal', function() {
    updateHeaderOnModalChange();
  });
  
  organizerCards.forEach(function(card) {
    card.addEventListener('click', function() {
      const organizerData = JSON.parse(this.getAttribute('data-organizer'));
      displayOrganizerDetails(organizerData);
      modalInstance.show();
    });
  });
  
  // Contact organizer button
  document.getElementById('contactOrganizerBtn').addEventListener('click', function() {
    const email = document.getElementById('modalOrganizerEmail').textContent;
    window.location.href = 'mailto:' + email;
  });
  
  // Also handle any other modals or popups that might be added
  document.addEventListener('show.bs.modal', function(e) {
    if (header) {
      header.classList.add('modal-open');
    }
  });
  
  document.addEventListener('hide.bs.modal', function(e) {
    // Check if any modal is still open
    const openModals = document.querySelectorAll('.modal.show');
    if (openModals.length === 0 && header) {
      header.classList.remove('modal-open');
    }
  });
});

function displayOrganizerDetails(data) {
  // Set basic info
  document.getElementById('modalOrganizerImage').src = data.image;
  document.getElementById('modalOrganizerName').textContent = data.name;
  document.getElementById('modalOrganizerType').textContent = data.type;
  document.getElementById('modalOrganizerDescription').textContent = data.description;
  
  // Set event details
  document.getElementById('modalEventDate').textContent = data.date;
  document.getElementById('modalEventTime').textContent = data.time;
  document.getElementById('modalEventPrice').textContent = data.price;
  
  // Set organizer contact info
  document.getElementById('modalOrganizerEmail').textContent = data.email;
  document.getElementById('modalOrganizerPhone').textContent = data.phone;
  document.getElementById('modalOrganizerLocation').textContent = data.location;
  
  // Set organizer bio and stats
  document.getElementById('modalOrganizerBio').textContent = data.bio;
  document.getElementById('modalOrganizerExperience').textContent = data.experience;
  document.getElementById('modalOrganizerEvents').textContent = data.events;
  
  // Set rating
  const ratingContainer = document.getElementById('modalOrganizerRating');
  ratingContainer.innerHTML = '';
  const fullStars = Math.floor(data.rating);
  const hasHalfStar = data.rating % 1 !== 0;
  
  for (let i = 0; i < fullStars; i++) {
    ratingContainer.innerHTML += '<i class="fa-solid fa-star text-warning"></i>';
  }
  if (hasHalfStar) {
    ratingContainer.innerHTML += '<i class="fa-solid fa-star-half-stroke text-warning"></i>';
  }
  for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
    ratingContainer.innerHTML += '<i class="fa-regular fa-star text-warning"></i>';
  }
  ratingContainer.innerHTML += '<span class="ms-2">' + data.rating + '</span>';
  
  // Set specialties
  const specialtiesContainer = document.getElementById('modalOrganizerSpecialties');
  specialtiesContainer.innerHTML = '';
  data.specialties.forEach(function(specialty) {
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary me-2 mb-2';
    badge.textContent = specialty;
    specialtiesContainer.appendChild(badge);
  });
}

function offcanvasInit() {
  const offcanvasElement = document.querySelectorAll(".nav-link");
  offcanvasElement.forEach((link) => {
    link.addEventListener("click", () => {
      const offcanvas = document.querySelector(".offcanvas");
      if (offcanvas) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
        if (bsOffcanvas) {
          bsOffcanvas.hide();
        }
      }
      const backdrop = document.querySelector(".offcanvas-backdrop");
      const show = document.querySelector(".show");
      if (backdrop) {
        backdrop.className = '';
      }
    });
  });
}
document.addEventListener("DOMContentLoaded", offcanvasInit);

document.addEventListener("DOMContentLoaded", function () {

  const sections = document.querySelectorAll(".section");
  const navLinks = document.querySelectorAll(".fbs__net-navbar .scroll-link");

  function removeActiveClasses() {
    if (navLinks) {
      navLinks.forEach((link) => link.classList.remove("active"));
    }
  }

  function addActiveClass(currentSectionId) {
    const activeLink = document.querySelector(
      `.fbs__net-navbar .scroll-link[href="#${currentSectionId}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  function getCurrentSection() {
    let currentSection = null;
    let minDistance = Infinity;
    if (sections) {
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const distance = Math.abs(rect.top - window.innerHeight / 4);

        if (distance < minDistance && rect.top < window.innerHeight) {
          minDistance = distance;
          currentSection = section.getAttribute("id");
        }
      });
    }

    return currentSection;
  }

  function updateActiveLink() {
    const currentSectionId = getCurrentSection();
    if (currentSectionId) {
      removeActiveClasses();
      addActiveClass(currentSectionId);
    }
  }

  window.addEventListener("scroll", updateActiveLink);

  const portfolioGrid = document.querySelector('#portfolio-grid');
  if (portfolioGrid) {
    var iso = new Isotope("#portfolio-grid", {
      itemSelector: ".portfolio-item",
      layoutMode: "masonry",
    });

    if (iso) {
      iso.on("layoutComplete", updateActiveLink);

      imagesLoaded("#portfolio-grid", function () {
        iso.layout();
        updateActiveLink();
      });
    }

    var filterButtons = document.querySelectorAll(".filter-button");
    if (filterButtons) {
      filterButtons.forEach(function (button) {
        button.addEventListener("click", function (e) {
          e.preventDefault();
          var filterValue = button.getAttribute("data-filter");
          iso.arrange({ filter: filterValue });

          filterButtons.forEach(function (btn) {
            btn.classList.remove("active");
          });
          button.classList.add("active");
          updateActiveLink();
        });
      });
    }

    updateActiveLink();
  }
});

//  Navbar Scroll 
document.addEventListener("DOMContentLoaded", function () {
  logoMarqueeInit();
  navbarInit();
  window.addEventListener("scroll", navbarScrollInit);
});

//  Swiper 
const swiperInit = () => {
  var swiper = new Swiper(".testimonialSwiper", {
    slidesPerView: 1,
    speed: 700,
    spaceBetween: 30,
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    breakpoints: {
      640: {
        slidesPerView: 1.5,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 2.5,
        spaceBetween: 30,
      },
      1024: {
        slidesPerView: 2.5,
        spaceBetween: 30,
      },
    },
    navigation: {
      nextEl: ".custom-button-next",
      prevEl: ".custom-button-prev",
    },
  });

  const progressCircle = document.querySelector(".autoplay-progress svg");
  const progressContent = document.querySelector(".autoplay-progress span");
  if (progressCircle && progressContent ) {
    var swiper2 = new Swiper(".sliderSwiper", {
      slidesPerView: 1,
      speed: 700,
      spaceBetween: 0,
      loop: true,
      centeredSlides: true,
      autoplay: {
        delay: 7000,
        disableOnInteraction: false
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".custom-button-next",
        prevEl: ".custom-button-prev",
      },

      on: {
        autoplayTimeLeft(s, time, progress) {
          progressCircle.style.setProperty("--progress", 1 - progress);
          progressContent.textContent = `${Math.ceil(time / 1000)}s`;
        }
      }
    });
  }

};

document.addEventListener("DOMContentLoaded", swiperInit);
