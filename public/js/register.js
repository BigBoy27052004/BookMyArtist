// ===============================
// BOOKMYARTIST REGISTER.JS
// ===============================

// -------------------------------
// Elements
// -------------------------------

const roleRadios = document.querySelectorAll('input[name="role"]');
const artistFields = document.getElementById("artistFields");

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const passwordMessage = document.getElementById("passwordMessage");

const registerForm = document.getElementById("registerForm");

const provinceSelect = document.getElementById("province");
const citySelect = document.getElementById("city");

// Artist fields
const stageName = document.querySelector('input[name="stage_name"]');
const genre = document.querySelector('select[name="genre"]');
const bookingPrice = document.querySelector('input[name="booking_price"]');
const biography = document.querySelector('textarea[name="biography"]');
const profileImage = document.querySelector('input[name="profile_image"]');

// ===============================
// Province -> Cities
// ===============================

const cities = {
  "Eastern Cape": ["East London", "Gqeberha", "Mthatha", "Queenstown"],

  "Free State": ["Bloemfontein", "Welkom", "Bethlehem", "Sasolburg"],

  Gauteng: ["Johannesburg", "Pretoria", "Soweto", "Midrand"],

  "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Richards Bay", "Newcastle"],

  Limpopo: ["Polokwane", "Thohoyandou", "Tzaneen", "Mokopane"],

  Mpumalanga: ["Mbombela", "Emalahleni", "Secunda", "Middelburg"],

  "North West": ["Rustenburg", "Mahikeng", "Klerksdorp", "Potchefstroom"],

  "Northern Cape": ["Kimberley", "Kuruman", "Upington", "Springbok"],

  "Western Cape": ["Cape Town", "George", "Paarl", "Stellenbosch"],
};

// ===============================
// Populate Cities
// ===============================

provinceSelect.addEventListener("change", () => {
  citySelect.innerHTML = '<option value="">Select City</option>';

  const selectedProvince = provinceSelect.value;

  if (cities[selectedProvince]) {
    cities[selectedProvince].forEach((city) => {
      const option = document.createElement("option");

      option.value = city;
      option.textContent = city;

      citySelect.appendChild(option);
    });
  }
});

// ===============================
// Toggle Artist Fields
// ===============================

function toggleArtistFields() {
  const role = document.querySelector('input[name="role"]:checked').value;

  if (role === "artist") {
    artistFields.style.display = "block";

    stageName.required = true;
    genre.required = true;
    provinceSelect.required = true;
    citySelect.required = true;
    bookingPrice.required = true;
    biography.required = true;
    profileImage.required = true;
  } else {
    artistFields.style.display = "none";

    stageName.required = false;
    genre.required = false;
    provinceSelect.required = false;
    citySelect.required = false;
    bookingPrice.required = false;
    biography.required = false;
    profileImage.required = false;
  }
}

roleRadios.forEach((radio) => {
  radio.addEventListener("change", toggleArtistFields);
});

toggleArtistFields();

// ===============================
// Password Validation
// ===============================

function checkPasswords() {
  if (confirmPassword.value === "") {
    passwordMessage.textContent = "";
    return;
  }

  if (password.value === confirmPassword.value) {
    passwordMessage.textContent = "✔ Passwords match";
    passwordMessage.style.color = "#22C55E";
  } else {
    passwordMessage.textContent = "✖ Passwords do not match";
    passwordMessage.style.color = "#EF4444";
  }
}

password.addEventListener("input", checkPasswords);
confirmPassword.addEventListener("input", checkPasswords);

// ===============================
// Prevent Submit if Passwords Differ
// ===============================

registerForm.addEventListener("submit", function (e) {
  if (password.value !== confirmPassword.value) {
    e.preventDefault();

    alert("Passwords do not match.");

    confirmPassword.focus();
  }
});
