"use strict";
/*
  CARSCAN AI
  Frontend + Cloudflare Worker
  NIE WKLEJAJ TUTAJ KLUCZA OPENAI.
*/
const API_URL = "https://carscan-ai.sz5758357.workers.dev";
const $ = (id) => document.getElementById(id);
let currentImage = "";
let currentResult = null;
let library = JSON.parse(
  localStorage.getItem("carscan_library_v3") || "[]"
);
/* =========================
   NAVIGATION
========================= */
const pages = {
  home: $("homePage"),
  scan: $("scanPage"),
  result: $("resultPage"),
  library: $("libraryPage"),
  settings: $("settingsPage")
};
function showPage(name) {
  Object.values(pages).forEach((page) => {
    if (page) page.classList.remove("active");
  });
  if (pages[name]) {
    pages[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
$("libraryBtn").addEventListener("click", () => {
  renderLibrary();
  showPage("library");
});
$("openLibraryBtn").addEventListener("click", () => {
  renderLibrary();
  showPage("library");
});
$("homeBtn").addEventListener("click", () => showPage("home"));
$("settingsBtn").addEventListener("click", () => showPage("settings"));
$("settingsBackBtn").addEventListener("click", () => showPage("home"));
$("scanBackBtn").addEventListener("click", () => showPage("home"));
$("resultBackBtn").addEventListener("click", () => showPage("home"));
/* =========================
   FILE INPUT
========================= */
$("cameraBtn").addEventListener("click", () => {
  $("cameraInput").click();
});
$("galleryBtn").addEventListener("click", () => {
  $("galleryInput").click();
});
$("cameraInput").addEventListener("change", (event) => {
  handleFile(event.target.files?.[0]);
  event.target.value = "";
});
$("galleryInput").addEventListener("change", (event) => {
  handleFile(event.target.files?.[0]);
  event.target.value = "";
});
async function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("Wybierz plik graficzny.");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    toast("Zdjęcie jest za duże. Maksymalnie 15 MB.");
    return;
  }
  try {
    currentImage = await optimizeImage(file);
    $("scanPreview").src = currentImage;
    showPage("scan");
    await scanCar();
  } catch (error) {
    console.error(error);
    toast("Nie udało się przygotować zdjęcia.");
    showPage("home");
  }
}
/* =========================
   IMAGE OPTIMIZATION
========================= */
function optimizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 1600;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(
            maxSize / width,
            maxSize / height
          );
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );
        resolve(
          canvas.toDataURL("image/jpeg", 0.88)
        );
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
/* =========================
   SCANNING
========================= */
async function scanCar() {
  setProgress(8, "Przygotowywanie zdjęcia...");
  setStep(1);
  await delay(500);
  setProgress(25, "Analizowanie obrazu...");
  setStep(2);
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: currentImage
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Worker zwrócił nieprawidłową odpowiedź."
      );
    }
    console.log("Worker:", data);
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error ||
        `Błąd serwera (${response.status})`
      );
    }
    setProgress(75, "Interpretowanie wyniku AI...");
    setStep(3);
    await delay(500);
    setProgress(100, "Gotowe");
    currentResult = normalizeResult(data);
    saveToLibrary(currentResult);
    renderResult(currentResult);
    await delay(300);
    showPage("result");
  } catch (error) {
    clearTimeout(timeout);
    console.error("SCAN ERROR:", error);
    let message = error.message || "Nieznany błąd.";
    if (error.name === "AbortError") {
      message = "Analiza trwała zbyt długo.";
    }
    toast(message);
    await delay(700);
    showPage("home");
  }
}
function setProgress(value, label) {
  $("progressBar").style.width = `${value}%`;
  $("progressPercent").textContent = `${value}%`;
  $("progressLabel").textContent = label;
}
function setStep(number) {
  ["step1", "step2", "step3"].forEach((id, index) => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle(
      "active",
      index < number
    );
  });
}
/* =========================
   RESULT
========================= */
function normalizeResult(data) {
  return {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    image: currentImage,
    brand: clean(data.brand),
    model: clean(data.model),
    generation: clean(data.generation),
    body: clean(data.body),
    engine: clean(data.engine),
    drive: clean(data.drive),
    year: clean(data.year),
    color: clean(data.color),
    notes: clean(data.notes),
    confidence: clamp(
      Number(data.confidence) || 0,
      0,
      100
    ),
    identifiable: data.identifiable !== false,
    createdAt: Date.now()
  };
}
function clean(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }
  return String(value);
}
function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}
function renderResult(car) {
  $("resultImage").src = car.image;
  $("confidenceBadge").textContent =
    `${Math.round(car.confidence)}% pewności`;
  const title =
    car.brand !== "—" && car.model !== "—"
      ? `${car.brand} ${car.model}`
      : car.brand !== "—"
        ? car.brand
        : "Nie rozpoznano";
  $("resultTitle").textContent = title;
  $("resultGeneration").textContent =
    car.generation !== "—"
      ? car.generation
      : "Brak pewnej informacji";
  $("resultBrand").textContent = car.brand;
  $("resultModel").textContent = car.model;
  $("resultBody").textContent = car.body;
  $("resultYear").textContent = car.year;
  $("resultEngine").textContent = car.engine;
  $("resultDrive").textContent = car.drive;
  $("resultColor").textContent = car.color;
  $("resultNotes").textContent = car.notes;
  const uncertain =
    car.identifiable === false ||
    car.confidence < 50;
  $("notIdentified").classList.toggle(
    "hidden",
    !uncertain
  );
}
/* =========================
   LIBRARY
========================= */
function saveToLibrary(car) {
  library.unshift(car);
  if (library.length > 100) {
    library = library.slice(0, 100);
  }
  localStorage.setItem(
    "carscan_library_v3",
    JSON.stringify(library)
  );
  renderRecent();
  updateLibraryEmpty();
}
function renderRecent() {
  const container = $("recentCars");
  if (!container) return;
  const recent = library.slice(0, 4);
  container.innerHTML = "";
  recent.forEach((car) => {
    container.appendChild(
      createCarCard(car, false)
    );
  });
  updateLibraryEmpty();
}
function renderLibrary() {
  const container = $("libraryGrid");
  const query =
    $("librarySearch").value
      .trim()
      .toLowerCase();
  container.innerHTML = "";
  const filtered = library.filter((car) => {
    const text = [
      car.brand,
      car.model,
      car.generation,
      car.year
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  });
  filtered.forEach((car) => {
    container.appendChild(
      createCarCard(car, true)
    );
  });
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-card visible" style="grid-column:1/-1">
        <div class="empty-icon">◇</div>
        <strong>Brak wyników</strong>
        <span>Nie znaleziono samochodu w bibliotece.</span>
      </div>
    `;
  }
}
function createCarCard(car, showDelete) {
  const card = document.createElement("article");
  card.className =
    showDelete
      ? "library-card"
      : "recent-card";
  card.innerHTML = `
    <img
      class="car-image"
      src="${escapeAttribute(car.image)}"
      alt=""
    >
    <div class="car-info">
      <strong>
        ${escapeHtml(car.brand)}
        ${escapeHtml(car.model)}
      </strong>
      <span>
        ${escapeHtml(car.generation)}
      </span>
    </div>
    ${
      showDelete
        ? `<button class="delete-card" aria-label="Usuń">×</button>`
        : ""
    }
  `;
  card.querySelector(".car-image")
    .addEventListener("click", () => {
      openModal(car.image);
    });
  if (showDelete) {
    card.querySelector(".delete-card")
      .addEventListener("click", (event) => {
        event.stopPropagation();
        deleteCar(car.id);
      });
  }
  return card;
}
function deleteCar(id) {
  library = library.filter(
    (car) => car.id !== id
  );
  localStorage.setItem(
    "carscan_library_v3",
    JSON.stringify(library)
  );
  renderLibrary();
  renderRecent();
  toast("Samochód usunięty.");
}
$("librarySearch").addEventListener(
  "input",
  renderLibrary
);
$("clearLibraryBtn").addEventListener(
  "click",
  () => {
    if (library.length === 0) {
      toast("Biblioteka jest już pusta.");
      return;
    }
    const confirmed =
      confirm(
        "Czy na pewno chcesz usunąć wszystkie zapisane samochody?"
      );
    if (!confirmed) return;
    library = [];
    localStorage.removeItem(
      "carscan_library_v3"
    );
    renderLibrary();
    renderRecent();
    toast("Biblioteka została wyczyszczona.");
  }
);
function updateLibraryEmpty() {
  const empty = $("libraryEmpty");
  if (!empty) return;
  empty.classList.toggle(
    "visible",
    library.length === 0
  );
}
/* =========================
   ACTIONS
========================= */
$("scanAgainBtn").addEventListener(
  "click",
  () => {
    $("cameraInput").click();
  }
);
$("resultLibraryBtn").addEventListener(
  "click",
  () => {
    renderLibrary();
    showPage("library");
  }
);
/* =========================
   IMAGE MODAL
========================= */
$("resultImage").addEventListener(
  "click",
  () => {
    if (currentResult?.image) {
      openModal(currentResult.image);
    }
  }
);
function openModal(src) {
  $("modalImage").src = src;
  $("imageModal").classList.remove("hidden");
}
function closeModal() {
  $("imageModal").classList.add("hidden");
  $("modalImage").src = "";
}
$("closeModal").addEventListener(
  "click",
  closeModal
);
$("imageModal").addEventListener(
  "click",
  (event) => {
    if (event.target === $("imageModal")) {
      closeModal();
    }
  }
);
/* =========================
   THEME
========================= */
const savedTheme =
  localStorage.getItem("carscan_theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  $("themeToggle").checked = false;
}
$("themeToggle").addEventListener(
  "change",
  () => {
    const light =
      !$("themeToggle").checked;
    document.body.classList.toggle(
      "light",
      light
    );
    localStorage.setItem(
      "carscan_theme",
      light ? "light" : "dark"
    );
  }
);
/* =========================
   TOUCH / DOUBLE TAP PROTECTION
========================= */
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  { passive: false }
);
document.addEventListener(
  "gesturestart",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);
document.addEventListener(
  "gesturechange",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);
document.addEventListener(
  "gestureend",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);
/* =========================
   TOAST
========================= */
let toastTimer;
function toast(message) {
  $("toastText").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("toast").classList.remove("show");
  }, 3200);
}
/* =========================
   HELPERS
========================= */
function delay(ms) {
  return new Promise(
    (resolve) => setTimeout(resolve, ms)
  );
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttribute(value) {
  return escapeHtml(value);
}
/* =========================
   START
========================= */
renderRecent();
updateLibraryEmpty();
