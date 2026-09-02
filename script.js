const API_URL = "https://carscan-ai.sz5758357.workers.dev";

const STORAGE_KEY = "carscan_library_v3";

let currentImage = null;
let currentResult = null;


/* =========================
   ELEMENTS
========================= */

const $ = (id) => document.getElementById(id);

const pages = {
  home: $("homePage"),
  scan: $("scanPage"),
  result: $("resultPage"),
  library: $("libraryPage"),
  settings: $("settingsPage")
};


/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", () => {

  loadTheme();
  setupNavigation();
  setupInputs();
  setupSettings();
  setupLibrary();
  setupResult();
  setupModal();
  setupTouchProtection();

  renderRecent();
  renderLibrary();
  updateLibraryCount();

});


/* =========================
   NAVIGATION
========================= */

function showPage(name) {

  Object.values(pages).forEach(page => {
    if (!page) return;

    page.classList.remove("active");
    page.style.display = "none";
  });

  const page = pages[name];

  if (!page) return;

  page.style.display = "block";

  requestAnimationFrame(() => {
    page.classList.add("active");
  });

  window.scrollTo(0, 0);
}


function setupNavigation() {

  $("homeBtn")?.addEventListener("click", () => {
    showPage("home");
  });

  $("libraryBtn")?.addEventListener("click", () => {
    renderLibrary();
    showPage("library");
  });

  $("openLibraryBtn")?.addEventListener("click", () => {
    renderLibrary();
    showPage("library");
  });

  $("settingsBtn")?.addEventListener("click", () => {
    updateLibraryCount();
    showPage("settings");
  });

  $("scanBackBtn")?.addEventListener("click", () => {
    showPage("home");
  });

  $("resultBackBtn")?.addEventListener("click", () => {
    showPage("home");
  });

  $("settingsBackBtn")?.addEventListener("click", () => {
    showPage("home");
  });

  $("emptyScanBtn")?.addEventListener("click", () => {
    $("galleryInput")?.click();
  });

}


/* =========================
   INPUTS
========================= */

function setupInputs() {

  $("cameraBtn")?.addEventListener("click", () => {
    $("cameraInput")?.click();
  });

  $("galleryBtn")?.addEventListener("click", () => {
    $("galleryInput")?.click();
  });

  $("cameraInput")?.addEventListener("change", handleFile);
  $("galleryInput")?.addEventListener("change", handleFile);


  document.addEventListener("dragover", event => {
    event.preventDefault();
  });


  document.addEventListener("drop", event => {

    event.preventDefault();

    const file =
      event.dataTransfer?.files?.[0];

    if (file) {
      processFile(file);
    }

  });

}


function handleFile(event) {

  const file =
    event.target.files?.[0];

  if (!file) return;

  processFile(file);

  event.target.value = "";
}


/* =========================
   IMAGE
========================= */

async function processFile(file) {

  if (!file.type.startsWith("image/")) {

    showToast("Wybierz zdjęcie samochodu.");

    return;
  }


  if (file.size > 15 * 1024 * 1024) {

    showToast(
      "Zdjęcie jest za duże. Maksymalnie 15 MB."
    );

    return;
  }


  try {

    showToast("Przygotowywanie zdjęcia...");

    currentImage =
      await prepareImage(file);

    $("scanPreview").src =
      currentImage;

    showPage("scan");

    startScan();

  } catch (error) {

    console.error(error);

    showToast(
      "Nie udało się przygotować zdjęcia."
    );

  }

}


function prepareImage(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();


    reader.onload = () => {

      const img =
        new Image();


      img.onload = () => {

        const MAX = 1600;

        let width =
          img.naturalWidth;

        let height =
          img.naturalHeight;


        if (
          width > MAX ||
          height > MAX
        ) {

          if (width > height) {

            height =
              Math.round(
                height * MAX / width
              );

            width = MAX;

          } else {

            width =
              Math.round(
                width * MAX / height
              );

            height = MAX;

          }

        }


        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;


        const ctx =
          canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );


        resolve(
          canvas.toDataURL(
            "image/jpeg",
            0.88
          )
        );

      };


      img.onerror = () => {
        reject(
          new Error(
            "Nie można odczytać zdjęcia."
          )
        );
      };


      img.src =
        reader.result;

    };


    reader.onerror = () => {
      reject(
        new Error(
          "Błąd odczytu zdjęcia."
        )
      );
    };


    reader.readAsDataURL(file);

  });

}


/* =========================
   AI SCAN
========================= */

async function startScan() {

  setProgress(
    5,
    "Przygotowywanie zdjęcia..."
  );

  setStep(1);

  await delay(400);


  setProgress(
    20,
    "Łączenie z AI..."
  );

  setStep(1);

  await delay(400);


  setProgress(
    35,
    "Wysyłanie zdjęcia..."
  );

  setStep(2);


  try {

    const controller =
      new AbortController();


    const timeout =
      setTimeout(
        () => controller.abort(),
        60000
      );


    const response =
      await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            image: currentImage
          }),

          signal: controller.signal
        }
      );


    clearTimeout(timeout);


    let data;

    try {

      data =
        await response.json();

    } catch {

      throw new Error(
        "Worker zwrócił nieprawidłową odpowiedź."
      );

    }


    console.log(
      "CarScan Worker:",
      data
    );


    if (!response.ok) {

      throw new Error(
        data?.error ||
        "Worker zwrócił błąd."
      );

    }


    if (!data.ok) {

      throw new Error(
        data.error ||
        "AI nie zwróciło wyniku."
      );

    }


    setProgress(
      70,
      "AI analizuje samochód..."
    );

    setStep(2);

    await delay(500);


    setProgress(
      88,
      "Rozpoznawanie szczegółów..."
    );

    setStep(3);

    await delay(500);


    currentResult =
      normalizeResult(data);


    setProgress(
      100,
      "Gotowe"
    );

    setStep(3);

    await delay(300);


    saveCar({
      ...currentResult,
      image: currentImage
    });


    renderResult();

    showPage("result");


    navigator.vibrate?.(
      [30, 40, 30]
    );


  } catch (error) {

    console.error(
      "CarScan AI:",
      error
    );


    let message =
      "Nie udało się połączyć z AI.";


    if (
      error.name ===
      "AbortError"
    ) {

      message =
        "AI nie odpowiedziało w ciągu 60 sekund.";

    } else if (
      error.message
    ) {

      message =
        error.message;

    }


    showToast(message);

    await delay(600);

    showPage("home");

  }

}


/* =========================
   RESULT
========================= */

function normalizeResult(data) {

  return {

    brand:
      value(
        data.brand,
        "Nieznana"
      ),

    model:
      value(
        data.model,
        "Nieznany"
      ),

    generation:
      value(
        data.generation,
        "Nieokreślona"
      ),

    body:
      value(
        data.body,
        "Nieokreślone"
      ),

    engine:
      value(
        data.engine,
        "Nieokreślony"
      ),

    drive:
      value(
        data.drive,
        "Nieokreślony"
      ),

    year:
      value(
        data.year,
        "Nieokreślony"
      ),

    color:
      value(
        data.color,
        "Nieokreślony"
      ),

    confidence:
      clamp(
        data.confidence,
        0,
        100
      ),

    identifiable:
      Boolean(
        data.identifiable
      ),

    notes:
      value(
        data.notes,
        "Brak dodatkowych uwag."
      )

  };

}


function renderResult() {

  if (
    !currentResult ||
    !currentImage
  ) return;


  $("resultImage").src =
    currentImage;


  $("confidenceBadge").textContent =
    `${Math.round(
      currentResult.confidence
    )}%`;


  $("resultTitle").textContent =
    `${currentResult.brand} ${currentResult.model}`;


  $("resultGeneration").textContent =
    currentResult.generation;


  $("resultBrand").textContent =
    currentResult.brand;

  $("resultModel").textContent =
    currentResult.model;

  $("resultBody").textContent =
    currentResult.body;

  $("resultYear").textContent =
    currentResult.year;

  $("resultEngine").textContent =
    currentResult.engine;

  $("resultDrive").textContent =
    currentResult.drive;

  $("resultColor").textContent =
    currentResult.color;

  $("resultNotes").textContent =
    currentResult.notes;


  if (
    !currentResult.identifiable ||
    currentResult.confidence < 50
  ) {

    $("notIdentified")
      ?.classList
      .remove("hidden");

  } else {

    $("notIdentified")
      ?.classList
      .add("hidden");

  }

}


function setupResult() {

  $("scanAgainBtn")?.addEventListener(
    "click",
    () => {
      $("galleryInput")?.click();
    }
  );


  $("resultLibraryBtn")?.addEventListener(
    "click",
    () => {
      renderLibrary();
      showPage("library");
    }
  );

}


/* =========================
   LIBRARY
========================= */

function getLibrary() {

  try {

    return JSON.parse(
      localStorage.getItem(
        STORAGE_KEY
      ) || "[]"
    );

  } catch {

    return [];

  }

}


function saveCar(car) {

  const library =
    getLibrary();


  library.unshift({
    id:
      `${Date.now()}-${Math.random()}`,

    createdAt:
      new Date().toISOString(),

    ...car
  });


  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        library.slice(0, 100)
      )
    );

  } catch {

    showToast(
      "Nie udało się zapisać auta."
    );

  }


  updateLibraryCount();
  renderRecent();

}


function renderLibrary() {

  const grid =
    $("libraryGrid");

  const empty =
    $("libraryEmpty");


  if (!grid || !empty) return;


  const query =
    (
      $("librarySearch")?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const cars =
    getLibrary()
      .filter(car => {

        const text =
          [
            car.brand,
            car.model,
            car.generation,
            car.year,
            car.color
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(query);

      });


  grid.innerHTML = "";


  if (!cars.length) {

    empty.style.display =
      "block";

    return;

  }


  empty.style.display =
    "none";


  cars.forEach(car => {

    const card =
      document.createElement("article");

    card.className =
      "library-card";


    card.innerHTML = `
      <div class="library-card-image">

        <img
          src="${escapeHTML(car.image)}"
          alt=""
          loading="lazy"
        >

        <div class="library-confidence">
          ${Math.round(car.confidence || 0)}%
        </div>

      </div>

      <div class="library-card-body">

        <strong>
          ${escapeHTML(
            `${car.brand} ${car.model}`
          )}
        </strong>

        <span>
          ${escapeHTML(
            `${car.generation || "—"} · ${car.year || "—"}`
          )}
        </span>

        <button
          class="library-delete"
          data-id="${car.id}"
        >
          USUŃ
        </button>

      </div>
    `;


    card.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            ".library-delete"
          )
        ) return;


        currentImage =
          car.image;

        currentResult =
          car;

        renderResult();

        showPage("result");

      }
    );


    card
      .querySelector(
        ".library-delete"
      )
      .addEventListener(
        "click",
        event => {

          event.stopPropagation();

          deleteCar(car.id);

        }
      );


    grid.appendChild(card);

  });

}


function renderRecent() {

  const container =
    $("recentCars");

  if (!container) return;


  const cars =
    getLibrary()
      .slice(0, 4);


  container.innerHTML = "";


  if (!cars.length) {

    container.innerHTML = `
      <div style="
        grid-column:1/-1;
        color:var(--muted);
        font-size:11px;
        padding:20px 0;
      ">
        Twoje ostatnie rozpoznania pojawią się tutaj.
      </div>
    `;

    return;

  }


  cars.forEach(car => {

    const card =
      document.createElement("article");

    card.className =
      "recent-card";


    card.innerHTML = `
      <img
        src="${escapeHTML(car.image)}"
        alt=""
        loading="lazy"
      >

      <div class="recent-card-content">

        <strong>
          ${escapeHTML(
            `${car.brand} ${car.model}`
          )}
        </strong>

        <span>
          ${escapeHTML(
            car.generation || "—"
          )}
        </span>

      </div>
    `;


    card.addEventListener(
      "click",
      () => {

        currentImage =
          car.image;

        currentResult =
          car;

        renderResult();

        showPage("result");

      }
    );


    container.appendChild(card);

  });

}


function deleteCar(id) {

  const library =
    getLibrary()
      .filter(
        car => car.id !== id
      );


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(library)
  );


  renderLibrary();
  renderRecent();
  updateLibraryCount();

  showToast(
    "Usunięto samochód."
  );

}


function setupLibrary() {

  $("librarySearch")
    ?.addEventListener(
      "input",
      renderLibrary
    );


  $("clearLibraryBtn")
    ?.addEventListener(
      "click",
      () => {

        if (
          !getLibrary().length
        ) {

          showToast(
            "Biblioteka jest pusta."
          );

          return;
        }


        if (
          confirm(
            "Usunąć całą bibliotekę?"
          )
        ) {

          localStorage.removeItem(
            STORAGE_KEY
          );

          renderLibrary();
          renderRecent();
          updateLibraryCount();

          showToast(
            "Biblioteka wyczyszczona."
          );

        }

      }
    );

}


function updateLibraryCount() {

  const element =
    $("libraryCount");

  if (!element) return;


  const count =
    getLibrary().length;


  element.textContent =
    `${count} ${
      count === 1
        ? "auto"
        : count < 5
          ? "auta"
          : "aut"
    }`;

}


/* =========================
   THEME
========================= */

function setupSettings() {

  $("themeToggle")
    ?.addEventListener(
      "click",
      () => {

        document.body
          .classList
          .toggle("light");


        const light =
          document.body
            .classList
            .contains("light");


        localStorage.setItem(
          "carscan_theme",
          light
            ? "light"
            : "dark"
        );


        updateThemeSwitch();

      }
    );

}


function loadTheme() {

  if (
    localStorage.getItem(
      "carscan_theme"
    ) === "light"
  ) {

    document.body
      .classList
      .add("light");

  }


  updateThemeSwitch();

}


function updateThemeSwitch() {

  $("themeToggle")
    ?.classList
    .toggle(
      "active",
      document.body.classList.contains(
        "light"
      )
    );

}


/* =========================
   MODAL
========================= */

function setupModal() {

  $("resultImage")
    ?.addEventListener(
      "click",
      () => {

        if (!currentImage) return;

        $("modalImage").src =
          currentImage;

        $("imageModal")
          .classList
          .remove("hidden");

      }
    );


  $("closeModal")
    ?.addEventListener(
      "click",
      closeModal
    );


  $("imageModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("imageModal")
        ) {

          closeModal();

        }

      }
    );

}


function closeModal() {

  $("imageModal")
    ?.classList
    .add("hidden");

}


/* =========================
   TOUCH
========================= */

function setupTouchProtection() {

  let lastTouch = 0;


  document.addEventListener(
    "touchend",
    event => {

      const now =
        Date.now();


      if (
        now - lastTouch < 300
      ) {

        event.preventDefault();

      }


      lastTouch =
        now;

    },
    {
      passive: false
    }
  );


  [
    "gesturestart",
    "gesturechange",
    "gestureend"
  ].forEach(eventName => {

    document.addEventListener(
      eventName,
      event => {
        event.preventDefault();
      },
      {
        passive: false
      }
    );

  });

}


/* =========================
   HELPERS
========================= */

function setProgress(
  percent,
  text
) {

  const bar =
    $("progressBar");

  const percentEl =
    $("progressPercent");

  const label =
    $("progressLabel");


  if (bar) {
    bar.style.width =
      `${percent}%`;
  }

  if (percentEl) {
    percentEl.textContent =
      `${percent}%`;
  }

  if (label) {
    label.textContent =
      text;
  }

}


function setStep(number) {

  document
    .querySelectorAll(
      ".progress-step"
    )
    .forEach(
      step =>
        step.classList.remove(
          "active"
        )
    );


  for (
    let i = 1;
    i <= number;
    i++
  ) {

    $(`step${i}`)
      ?.classList
      .add("active");

  }

}


function value(
  value,
  fallback
) {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {

    return fallback;

  }

  return String(value).trim();

}


function clamp(
  value,
  min,
  max
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {

    return min;

  }


  return Math.max(
    min,
    Math.min(max, number)
  );

}


function delay(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function showToast(message) {

  const toast =
    $("toast");

  const text =
    $("toastText");


  if (!toast || !text) return;


  text.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    window.__toastTimer
  );


  window.__toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3500
    );

}


/* =========================
   NO CONTEXT MENU
========================= */

document.addEventListener(
  "contextmenu",
  event => {

    if (
      event.target.tagName !==
      "INPUT"
    ) {

      event.preventDefault();

    }

  }
);
