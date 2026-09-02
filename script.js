/* =========================================================
   CARSCAN AI
   Frontend v2.0
========================================================= */

const API_URL =
  "https://carscan-ai.sz5758357.workers.dev";

const STORAGE_KEY =
  "carscan_library_v3";

let currentImage = null;
let currentResult = null;
let currentFile = null;

let scanTimer = null;
let toastTimer = null;


/* =========================================================
   ELEMENTS
========================================================= */

const $ = (id) => document.getElementById(id);

const pages = {
  home: $("homePage"),
  scan: $("scanPage"),
  result: $("resultPage"),
  library: $("libraryPage"),
  settings: $("settingsPage")
};


/* =========================================================
   INIT
========================================================= */

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

});


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(name) {

  Object.values(pages).forEach(page => {
    page.classList.remove("active");
    page.style.display = "none";
  });

  const page = pages[name];

  if (!page) return;

  page.style.display = "block";

  requestAnimationFrame(() => {
    page.classList.add("active");
  });

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}


function setupNavigation() {

  $("homeBtn").addEventListener("click", () => {
    showPage("home");
  });

  $("libraryBtn").addEventListener("click", () => {
    renderLibrary();
    showPage("library");
  });

  $("openLibraryBtn").addEventListener("click", () => {
    renderLibrary();
    showPage("library");
  });

  $("settingsBtn").addEventListener("click", () => {
    updateLibraryCount();
    showPage("settings");
  });

  $("scanBackBtn").addEventListener("click", () => {
    showPage("home");
  });

  $("resultBackBtn").addEventListener("click", () => {
    showPage("home");
  });

  $("settingsBackBtn").addEventListener("click", () => {
    showPage("home");
  });

  $("emptyScanBtn").addEventListener("click", () => {
    openGallery();
  });

}


/* =========================================================
   INPUTS
========================================================= */

function setupInputs() {

  $("cameraBtn").addEventListener("click", () => {
    $("cameraInput").click();
  });

  $("galleryBtn").addEventListener("click", () => {
    $("galleryInput").click();
  });

  $("cameraInput").addEventListener("change", handleFile);

  $("galleryInput").addEventListener("change", handleFile);


  document.addEventListener("dragover", event => {
    event.preventDefault();
  });

  document.addEventListener("drop", event => {

    event.preventDefault();

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      processFile(file);
    }

  });

}


function openGallery() {
  $("galleryInput").click();
}


function handleFile(event) {

  const file = event.target.files?.[0];

  if (!file) return;

  processFile(file);

  event.target.value = "";
}


/* =========================================================
   FILE PROCESSING
========================================================= */

async function processFile(file) {

  if (!file.type.startsWith("image/")) {

    showToast("Wybierz plik graficzny.");

    return;
  }

  if (file.size > 15 * 1024 * 1024) {

    showToast("Zdjęcie jest za duże. Maksymalnie 15 MB.");

    return;
  }

  currentFile = file;

  try {

    showToast("Przygotowuję zdjęcie...");

    currentImage = await prepareImage(file);

    $("scanPreview").src = currentImage;

    showPage("scan");

    startScan();

  } catch (error) {

    console.error(error);

    showToast("Nie udało się przygotować zdjęcia.");

  }

}


/* =========================================================
   IMAGE OPTIMIZATION
========================================================= */

function prepareImage(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => {

      const img = new Image();

      img.onload = () => {

        const MAX_SIZE = 1600;

        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > MAX_SIZE || height > MAX_SIZE) {

          if (width > height) {

            height =
              Math.round(
                height * MAX_SIZE / width
              );

            width = MAX_SIZE;

          } else {

            width =
              Math.round(
                width * MAX_SIZE / height
              );

            height = MAX_SIZE;

          }

        }

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx =
          canvas.getContext("2d", {
            alpha: false
          });

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        const dataUrl =
          canvas.toDataURL(
            "image/jpeg",
            .88
          );

        resolve(dataUrl);

      };

      img.onerror = () => {
        reject(
          new Error("Nie można odczytać zdjęcia.")
        );
      };

      img.src = reader.result;

    };

    reader.onerror = () => {
      reject(
        new Error("Błąd odczytu pliku.")
      );
    };

    reader.readAsDataURL(file);

  });

}


/* =========================================================
   SCANNING
========================================================= */

async function startScan() {

  stopScanTimer();

  setProgress(4, "Przygotowywanie zdjęcia...");

  setStep(1);

  await delay(500);

  setProgress(22, "Przesyłanie zdjęcia...");

  setStep(1);

  await delay(600);

  setProgress(40, "AI analizuje samochód...");

  setStep(2);

  await delay(500);

  setProgress(57, "Porównywanie cech auta...");

  setStep(2);

  const fakeProgress =
    setInterval(() => {

      const current =
        Number(
          $("progressPercent").textContent
            .replace("%", "")
        );

      if (current < 82) {

        setProgress(
          current + 2,
          "Analiza obrazu..."
        );

      }

    }, 350);


  try {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        45000
      );


    const response =
      await fetch(API_URL, {

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

    clearInterval(fakeProgress);


    let data = null;

    try {

      data = await response.json();

    } catch {

      throw new Error(
        "Worker zwrócił nieprawidłową odpowiedź."
      );

    }


    if (!response.ok || !data?.ok) {

      console.error(
        "Worker error:",
        data
      );

      throw new Error(
        data?.error ||
        "AI nie mogło przeanalizować zdjęcia."
      );

    }


    setProgress(
      90,
      "Finalizowanie rozpoznania..."
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

    await delay(350);


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

    clearInterval(fakeProgress);

    console.error(
      "CarScan AI error:",
      error
    );

    let message =
      "Nie udało się rozpoznać samochodu.";

    if (
      error?.name === "AbortError"
    ) {

      message =
        "AI nie odpowiedziało w ciągu 45 sekund.";

    } else if (
      error?.message
    ) {

      message =
        error.message;
    }


    showToast(message);

    await delay(500);

    showPage("home");

  }

}


function stopScanTimer() {

  if (scanTimer) {

    clearInterval(scanTimer);

    scanTimer = null;

  }

}


function setProgress(percent, label) {

  const safe =
    Math.max(
      0,
      Math.min(100, percent)
    );

  $("progressBar").style.width =
    `${safe}%`;

  $("progressPercent").textContent =
    `${Math.round(safe)}%`;

  $("progressLabel").textContent =
    label;

}


function setStep(number) {

  document
    .querySelectorAll(".progress-step")
    .forEach(step => {
      step.classList.remove("active");
    });

  for (
    let i = 1;
    i <= number;
    i++
  ) {

    $(`step${i}`)
      ?.classList.add("active");

  }

}


/* =========================================================
   RESULT NORMALIZATION
========================================================= */

function normalizeResult(data) {

  return {

    brand:
      cleanValue(
        data.brand,
        "Nieznana"
      ),

    model:
      cleanValue(
        data.model,
        "Nieznany"
      ),

    generation:
      cleanValue(
        data.generation,
        "Nieokreślona"
      ),

    body:
      cleanValue(
        data.body,
        "Nieokreślone"
      ),

    engine:
      cleanValue(
        data.engine,
        "Nieokreślony"
      ),

    drive:
      cleanValue(
        data.drive,
        "Nieokreślony"
      ),

    year:
      cleanValue(
        data.year,
        "Nieokreślony"
      ),

    color:
      cleanValue(
        data.color,
        "Nieokreślony"
      ),

    confidence:
      clampNumber(
        data.confidence,
        0,
        100
      ),

    identifiable:
      Boolean(
        data.identifiable
      ),

    notes:
      cleanValue(
        data.notes,
        "Brak dodatkowych uwag."
      )

  };

}


function cleanValue(value, fallback) {

  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  const text =
    String(value).trim();

  return text || fallback;
}


function clampNumber(value, min, max) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.max(
    min,
    Math.min(max, number)
  );

}


/* =========================================================
   RESULT UI
========================================================= */

function setupResult() {

  $("scanAgainBtn")
    .addEventListener(
      "click",
      () => {
        openGallery();
      }
    );

  $("resultLibraryBtn")
    .addEventListener(
      "click",
      () => {
        renderLibrary();
        showPage("library");
      }
    );

}


function renderResult() {

  if (
    !currentResult ||
    !currentImage
  ) {
    return;
  }


  $("resultImage").src =
    currentImage;


  $("confidenceBadge").textContent =
    `${Math.round(currentResult.confidence)}%`;


  const title =
    [
      currentResult.brand,
      currentResult.model
    ]
      .filter(isUsefulValue)
      .join(" ");


  $("resultTitle").textContent =
    title || "Nieznany samochód";


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
    currentResult.identifiable === false ||
    currentResult.confidence < 50
  ) {

    $("notIdentified")
      .classList.remove("hidden");

    $("uncertainText").textContent =
      currentResult.notes ||
      "Zdjęcie nie pozwala na wystarczająco pewne rozpoznanie.";

  } else {

    $("notIdentified")
      .classList.add("hidden");

  }

}


function isUsefulValue(value) {

  if (!value) return false;

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  return ![
    "nieznana",
    "nieznany",
    "nieokreślona",
    "nieokreślone",
    "nieokreślony"
  ].includes(normalized);

}


/* =========================================================
   LIBRARY
========================================================= */

function getLibrary() {

  try {

    const data =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!data) return [];

    const parsed =
      JSON.parse(data);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(error);

    return [];

  }

}


function saveCar(car) {

  const library =
    getLibrary();


  const item = {

    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,

    createdAt:
      new Date().toISOString(),

    ...car

  };


  library.unshift(item);


  const limited =
    library.slice(0, 100);


  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(limited)
    );

  } catch (error) {

    console.error(
      "LocalStorage error:",
      error
    );

    showToast(
      "Auto rozpoznane, ale biblioteka jest pełna."
    );

  }


  updateLibraryCount();

}


function deleteCar(id) {

  const library =
    getLibrary()
      .filter(car => car.id !== id);


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(library)
  );


  renderLibrary();
  renderRecent();
  updateLibraryCount();

  showToast("Usunięto z biblioteki.");

}


function clearLibrary() {

  const library =
    getLibrary();

  if (!library.length) {

    showToast(
      "Biblioteka jest już pusta."
    );

    return;
  }


  const confirmed =
    confirm(
      "Usunąć wszystkie rozpoznane samochody?"
    );

  if (!confirmed) return;


  localStorage.removeItem(
    STORAGE_KEY
  );


  renderLibrary();
  renderRecent();
  updateLibraryCount();

  showToast(
    "Biblioteka została wyczyszczona."
  );

}


function setupLibrary() {

  $("clearLibraryBtn")
    .addEventListener(
      "click",
      clearLibrary
    );


  $("librarySearch")
    .addEventListener(
      "input",
      renderLibrary
    );

}


function renderLibrary() {

  const grid =
    $("libraryGrid");

  const empty =
    $("libraryEmpty");


  if (!grid || !empty) {
    return;
  }


  const query =
    (
      $("librarySearch")?.value ||
      ""
    )
      .trim()
      .toLowerCase();


  const library =
    getLibrary();


  const filtered =
    library.filter(car => {

      const text =
        [
          car.brand,
          car.model,
          car.generation,
          car.body,
          car.year,
          car.color
        ]
          .join(" ")
          .toLowerCase();

      return text.includes(query);

    });


  grid.innerHTML = "";


  if (!filtered.length) {

    empty.style.display =
      "block";

    if (query) {

      empty.querySelector("h3")
        .textContent =
        "Brak wyników";

      empty.querySelector("p")
        .textContent =
        "Nie znaleziono samochodu pasującego do wyszukiwania.";

    } else {

      empty.querySelector("h3")
        .textContent =
        "Biblioteka jest pusta";

      empty.querySelector("p")
        .textContent =
        "Rozpoznane samochody będą automatycznie pojawiać się tutaj.";

    }

    return;

  }


  empty.style.display =
    "none";


  filtered.forEach(car => {

    const card =
      document.createElement("article");

    card.className =
      "library-card";


    const image =
      document.createElement("div");

    image.className =
      "library-card-image";


    const img =
      document.createElement("img");

    img.src =
      car.image;

    img.alt =
      `${car.brand} ${car.model}`;

    img.loading =
      "lazy";


    const confidence =
      document.createElement("div");

    confidence.className =
      "library-confidence";

    confidence.textContent =
      `${Math.round(car.confidence || 0)}%`;


    image.appendChild(img);
    image.appendChild(confidence);


    const body =
      document.createElement("div");

    body.className =
      "library-card-body";


    const title =
      document.createElement("strong");

    title.textContent =
      `${car.brand} ${car.model}`;


    const subtitle =
      document.createElement("span");

    subtitle.textContent =
      `${car.generation || "Generacja nieznana"} · ${car.year || "—"}`;


    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "library-delete";

    deleteButton.textContent =
      "USUŃ";

    deleteButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        deleteCar(car.id);

      }
    );


    body.appendChild(title);
    body.appendChild(subtitle);
    body.appendChild(deleteButton);


    card.appendChild(image);
    card.appendChild(body);


    card.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            ".library-delete"
          )
        ) {
          return;
        }

        currentImage =
          car.image;

        currentResult =
          car;

        renderResult();

        showPage("result");

      }
    );


    grid.appendChild(card);

  });

}


function renderRecent() {

  const container =
    $("recentCars");

  if (!container) return;


  const library =
    getLibrary().slice(0, 4);


  container.innerHTML = "";


  if (!library.length) {

    container.innerHTML = `
      <div style="
        grid-column:1/-1;
        padding:20px 0;
        color:var(--muted);
        font-size:11px;
      ">
        Twoje ostatnie rozpoznania pojawią się tutaj.
      </div>
    `;

    return;

  }


  library.forEach(car => {

    const card =
      document.createElement("article");

    card.className =
      "recent-card";


    const img =
      document.createElement("img");

    img.src =
      car.image;

    img.alt =
      `${car.brand} ${car.model}`;


    const content =
      document.createElement("div");

    content.className =
      "recent-card-content";


    const title =
      document.createElement("strong");

    title.textContent =
      `${car.brand} ${car.model}`;


    const subtitle =
      document.createElement("span");

    subtitle.textContent =
      car.generation || "Generacja nieznana";


    content.appendChild(title);
    content.appendChild(subtitle);


    card.appendChild(img);
    card.appendChild(content);


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


function updateLibraryCount() {

  const count =
    getLibrary().length;

  const element =
    $("libraryCount");

  if (!element) return;


  element.textContent =
    `${count} ${polishCars(count)}`;

}


function polishCars(count) {

  if (count === 1) return "auto";

  if (
    count >= 2 &&
    count <= 4
  ) {
    return "auta";
  }

  return "aut";

}


/* =========================================================
   THEME
========================================================= */

function setupSettings() {

  $("themeToggle")
    .addEventListener(
      "click",
      toggleTheme
    );

}


function loadTheme() {

  const theme =
    localStorage.getItem(
      "carscan_theme"
    );


  if (theme === "light") {

    document.body
      .classList
      .add("light");

  }


  updateThemeSwitch();

}


function toggleTheme() {

  document.body
    .classList
    .toggle("light");


  const isLight =
    document.body
      .classList
      .contains("light");


  localStorage.setItem(
    "carscan_theme",
    isLight
      ? "light"
      : "dark"
  );


  updateThemeSwitch();

}


function updateThemeSwitch() {

  const toggle =
    $("themeToggle");

  if (!toggle) return;


  toggle.classList.toggle(
    "active",
    document.body.classList.contains(
      "light"
    )
  );

}


/* =========================================================
   MODAL
========================================================= */

function setupModal() {

  $("resultImage")
    .addEventListener(
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
    .addEventListener(
      "click",
      closeModal
    );


  $("imageModal")
    .addEventListener(
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
    .classList
    .add("hidden");

}


/* =========================================================
   TOUCH / ZOOM PROTECTION
========================================================= */

function setupTouchProtection() {

  let lastTouchEnd = 0;


  document.addEventListener(
    "touchend",
    event => {

      const now =
        Date.now();


      if (
        now - lastTouchEnd <= 300
      ) {

        event.preventDefault();

      }


      lastTouchEnd =
        now;

    },
    {
      passive: false
    }
  );


  document.addEventListener(
    "gesturestart",
    event => {
      event.preventDefault();
    },
    {
      passive: false
    }
  );


  document.addEventListener(
    "gesturechange",
    event => {
      event.preventDefault();
    },
    {
      passive: false
    }
  );


  document.addEventListener(
    "gestureend",
    event => {
      event.preventDefault();
    },
    {
      passive: false
    }
  );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

  const toast =
    $("toast");

  const text =
    $("toastText");


  text.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );

}


/* =========================================================
   HELPERS
========================================================= */

function delay(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


/* =========================================================
   PREVENT CONTEXT MENU ON LONG PRESS
========================================================= */

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
