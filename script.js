"use strict";

/*
  ==========================================
  CARSCAN AI 2.0
  ==========================================

  WAŻNE:
  Wpisz tutaj adres swojego backendu.

  Przykład:
  https://carscan-ai-api.twojanazwa.workers.dev

  NIE WKLEJAJ TUTAJ KLUCZA OPENAI.
*/

const API_URL = "https://carscan-ai.sz5758357.workers.dev";

const STORAGE_KEY = "carscan_library_v2";
const THEME_KEY = "carscan_theme_v2";

let currentImage = "";
let currentResult = null;


/* =========================
   ELEMENTY
========================= */

const $ = (selector) => document.querySelector(selector);

const pages = document.querySelectorAll(".page");
const navItems = document.querySelectorAll(".nav-item");

const cameraInput = $("#cameraInput");
const galleryInput = $("#galleryInput");

const scanImage = $("#scanImage");
const resultImage = $("#resultImage");

const progressBar = $("#progressBar");
const scanProgressText = $("#scanProgressText");
const scanStatus = $("#scanStatus");

const confidenceText = $("#confidenceText");
const confidenceBar = $("#confidenceBar");

const libraryGrid = $("#libraryGrid");
const emptyLibrary = $("#emptyLibrary");
const libraryCount = $("#libraryCount");

const toast = $("#toast");
const toastText = $("#toastText");

const imageModal = $("#imageModal");
const modalImage = $("#modalImage");


/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", () => {

  loadTheme();
  renderLibrary();

  setupNavigation();
  setupScanner();
  setupLibrary();
  setupSettings();
  setupModal();

  updateLibraryCount();

});


/* =========================
   NAWIGACJA
========================= */

function setupNavigation() {

  navItems.forEach(button => {

    button.addEventListener("click", () => {

      const pageId = button.dataset.page;

      showPage(pageId);

    });

  });

}


function showPage(pageId) {

  pages.forEach(page => {

    page.classList.toggle(
      "active",
      page.id === pageId
    );

  });


  navItems.forEach(item => {

    item.classList.toggle(
      "active",
      item.dataset.page === pageId
    );

  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   SKANER
========================= */

function setupScanner() {

  $("#cameraBtn").addEventListener(
    "click",
    () => cameraInput.click()
  );

  $("#galleryBtn").addEventListener(
    "click",
    () => galleryInput.click()
  );


  cameraInput.addEventListener(
    "change",
    handleFile
  );

  galleryInput.addEventListener(
    "change",
    handleFile
  );


  $("#againBtn").addEventListener(
    "click",
    () => {
      showPage("homePage");
    }
  );


  $("#emptyScanBtn").addEventListener(
    "click",
    () => {
      showPage("homePage");
    }
  );


  const dropZone = $("#dropZone");


  ["dragenter", "dragover"].forEach(eventName => {

    dropZone.addEventListener(eventName, event => {

      event.preventDefault();

      dropZone.style.transform = "scale(1.015)";
      dropZone.style.borderColor = "rgba(109,124,255,.5)";

    });

  });


  ["dragleave", "drop"].forEach(eventName => {

    dropZone.addEventListener(eventName, event => {

      event.preventDefault();

      dropZone.style.transform = "";
      dropZone.style.borderColor = "";

    });

  });


  dropZone.addEventListener("drop", event => {

    const file = event.dataTransfer.files[0];

    if (file) {
      processFile(file);
    }

  });

}


/* =========================
   PLIK
========================= */

function handleFile(event) {

  const file = event.target.files?.[0];

  if (!file) return;

  processFile(file);

  event.target.value = "";

}


function processFile(file) {

  if (!file.type.startsWith("image/")) {

    showToast("Wybierz plik graficzny.");

    return;
  }


  if (file.size > 15 * 1024 * 1024) {

    showToast("Zdjęcie jest za duże. Maksymalnie 15 MB.");

    return;
  }


  const reader = new FileReader();


  reader.onload = () => {

    currentImage = reader.result;

    scanImage.src = currentImage;

    resultImage.src = currentImage;

    showPage("scanPage");

    runAI();

  };


  reader.onerror = () => {

    showToast("Nie udało się odczytać zdjęcia.");

  };


  reader.readAsDataURL(file);

}


/* =========================
   AI
========================= */

async function runAI() {

  setProgress(8, "Przygotowywanie zdjęcia...");

  await sleep(350);

  setProgress(20, "Analizowanie kształtu samochodu...");

  await sleep(450);

  setProgress(34, "Rozpoznawanie marki...");

  await sleep(450);

  setProgress(48, "Porównywanie modelu...");

  await sleep(450);

  setProgress(61, "Sprawdzanie generacji...");

  await sleep(400);

  setProgress(74, "Analizowanie szczegółów...");

  try {

    const response = await fetch(
      API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: currentImage
        })
      }
    );


    if (!response.ok) {

      let message = "Błąd serwera AI.";

      try {
        const errorData = await response.json();

        if (errorData.error) {
          message = errorData.error;
        }

      } catch {}

      throw new Error(message);

    }


    setProgress(
      88,
      "Weryfikowanie wyniku..."
    );


    const data = await response.json();


    await sleep(500);

    setProgress(
      100,
      "Gotowe"
    );


    await sleep(350);

    currentResult = normalizeResult(data);

    showResult(currentResult);

    saveToLibrary(currentResult);

  } catch (error) {

    console.error(error);

    setProgress(
      100,
      "Nie udało się zakończyć analizy"
    );


    showToast(
      error.message ||
      "Nie udało się połączyć z AI."
    );

  }

}


function normalizeResult(data) {

  return {

    brand: clean(data.brand),
    model: clean(data.model),
    generation: clean(data.generation),
    body: clean(data.body),
    engine: clean(data.engine),
    drive: clean(data.drive),
    year: clean(data.year),
    color: clean(data.color),

    confidence: clamp(
      Number(data.confidence) || 0,
      0,
      100
    ),

    identifiable: data.identifiable !== false,

    notes: clean(data.notes)

  };

}


function clean(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "Nieznane";
  }

  return String(value)
    .trim()
    .slice(0, 150);

}


function clamp(value, min, max) {

  return Math.min(
    Math.max(value, min),
    max
  );

}


/* =========================
   WYNIK
========================= */

function showResult(result) {

  $("#resultBrand").textContent = result.brand;
  $("#resultModel").textContent = result.model;

  $("#resultGeneration").textContent =
    result.generation;

  $("#resultBody").textContent =
    result.body;

  $("#resultEngine").textContent =
    result.engine;

  $("#resultDrive").textContent =
    result.drive;

  $("#resultYear").textContent =
    result.year;

  $("#resultColor").textContent =
    result.color;


  confidenceText.textContent =
    `${result.confidence}%`;


  setTimeout(() => {

    confidenceBar.style.width =
      `${result.confidence}%`;

  }, 100);


  const uncertainBox = $("#uncertainBox");


  if (
    !result.identifiable ||
    result.confidence < 60
  ) {

    uncertainBox.classList.remove(
      "hidden"
    );

  } else {

    uncertainBox.classList.add(
      "hidden"
    );

  }


  showPage("resultPage");

  if (navigator.vibrate) {
    navigator.vibrate(40);
  }

}


function setProgress(percent, text) {

  progressBar.style.width =
    `${percent}%`;

  scanProgressText.textContent =
    `${percent}%`;

  scanStatus.textContent =
    text;

}


/* =========================
   BIBLIOTEKA
========================= */

function getLibrary() {

  try {

    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    ) || [];

  } catch {

    return [];

  }

}


function saveToLibrary(result) {

  if (!result) return;


  const library = getLibrary();


  const item = {

    id:
      Date.now().toString(36) +
      Math.random().toString(36).slice(2),

    createdAt:
      new Date().toISOString(),

    image:
      currentImage,

    ...result

  };


  library.unshift(item);


  /*
    Maksymalnie 50 zapisów.
    Dzięki temu localStorage nie zostanie
    zapchany po wielu dużych zdjęciach.
  */

  const limited =
    library.slice(0, 50);


  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(limited)
    );

    renderLibrary();

    updateLibraryCount();

  } catch {

    /*
      Jeśli pamięć przeglądarki jest pełna,
      usuwamy najstarsze wpisy.
    */

    const smaller =
      library.slice(0, 15);

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(smaller)
      );

    } catch {

      console.warn(
        "Biblioteka jest pełna."
      );

    }

  }

}


function renderLibrary() {

  const library = getLibrary();

  const query =
    ($("#librarySearch")?.value || "")
      .trim()
      .toLowerCase();


  const filtered =
    library.filter(item => {

      const text = [

        item.brand,
        item.model,
        item.generation,
        item.body

      ].join(" ").toLowerCase();

      return text.includes(query);

    });


  libraryGrid.innerHTML = "";


  if (filtered.length === 0) {

    emptyLibrary.classList.remove(
      "hidden"
    );

    return;

  }


  emptyLibrary.classList.add(
    "hidden"
  );


  filtered.forEach((item, index) => {

    const article =
      document.createElement("article");

    article.className =
      "library-item";

    article.style.animationDelay =
      `${index * 40}ms`;


    const imageWrap =
      document.createElement("div");

    imageWrap.className =
      "library-image";


    const image =
      document.createElement("img");

    image.src =
      item.image;

    image.alt =
      `${item.brand} ${item.model}`;


    const deleteBtn =
      document.createElement("button");

    deleteBtn.className =
      "delete-library";

    deleteBtn.textContent =
      "×";


    deleteBtn.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        deleteLibraryItem(item.id);

      }
    );


    imageWrap.appendChild(image);
    imageWrap.appendChild(deleteBtn);


    const info =
      document.createElement("div");

    info.className =
      "library-info";


    const brand =
      document.createElement("div");

    brand.className =
      "library-brand";

    brand.textContent =
      item.brand;


    const model =
      document.createElement("div");

    model.className =
      "library-model";

    model.textContent =
      item.model;


    const meta =
      document.createElement("div");

    meta.className =
      "library-meta";

    meta.textContent =
      `${item.generation} • ${item.confidence}% pewności`;


    info.appendChild(brand);
    info.appendChild(model);
    info.appendChild(meta);


    article.appendChild(imageWrap);
    article.appendChild(info);


    article.addEventListener(
      "click",
      () => openLibraryItem(item)
    );


    libraryGrid.appendChild(article);

  });

}


function openLibraryItem(item) {

  currentImage =
    item.image;

  currentResult =
    item;

  resultImage.src =
    item.image;

  showResult(item);

}


function deleteLibraryItem(id) {

  const updated =
    getLibrary().filter(
      item => item.id !== id
    );


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated)
  );


  renderLibrary();
  updateLibraryCount();

  showToast("Usunięto z Biblioteki.");

}


function setupLibrary() {

  $("#librarySearch").addEventListener(
    "input",
    renderLibrary
  );


  $("#clearLibraryBtn").addEventListener(
    "click",
    () => {

      const library = getLibrary();

      if (!library.length) {

        showToast(
          "Biblioteka jest już pusta."
        );

        return;
      }


      const confirmed =
        confirm(
          "Usunąć wszystkie samochody z Biblioteki?"
        );


      if (!confirmed) return;


      localStorage.removeItem(
        STORAGE_KEY
      );


      renderLibrary();
      updateLibraryCount();

      showToast(
        "Biblioteka została wyczyszczona."
      );

    }
  );


  $("#saveLibraryBtn").addEventListener(
    "click",
    () => {

      showToast(
        "Samochód jest już w Bibliotece."
      );

    }
  );

}


function updateLibraryCount() {

  const count =
    getLibrary().length;

  libraryCount.textContent =
    count > 99 ? "99+" : count;

}


/* =========================
   USTAWIENIA
========================= */

function setupSettings() {

  $("#themeBtn").addEventListener(
    "click",
    toggleTheme
  );

  $("#themeSetting").addEventListener(
    "click",
    toggleTheme
  );

}


function loadTheme() {

  const theme =
    localStorage.getItem(THEME_KEY) ||
    "dark";


  document.body.classList.toggle(
    "light",
    theme === "light"
  );


  updateThemeText();

}


function toggleTheme() {

  const isLight =
    document.body.classList.toggle(
      "light"
    );


  localStorage.setItem(
    THEME_KEY,
    isLight ? "light" : "dark"
  );


  updateThemeText();

}


function updateThemeText() {

  const isLight =
    document.body.classList.contains(
      "light"
    );


  $("#themeValue").textContent =
    isLight ? "Jasny" : "Ciemny";

}


/* =========================
   KOPIOWANIE
========================= */

$("#copyBtn").addEventListener(
  "click",
  async () => {

    if (!currentResult) return;


    const text = `CarScan AI

Marka: ${currentResult.brand}
Model: ${currentResult.model}
Generacja: ${currentResult.generation}
Nadwozie: ${currentResult.body}
Silnik: ${currentResult.engine}
Napęd: ${currentResult.drive}
Rocznik: ${currentResult.year}
Kolor: ${currentResult.color}
Pewność AI: ${currentResult.confidence}%`;


    try {

      await navigator.clipboard.writeText(
        text
      );

      showToast(
        "Informacje skopiowane."
      );

    } catch {

      showToast(
        "Nie udało się skopiować."
      );

    }

  }
);


/* =========================
   UDOSTĘPNIANIE
========================= */

$("#shareBtn").addEventListener(
  "click",
  async () => {

    if (!currentResult) return;


    const text =
      `CarScan AI rozpoznał: ${currentResult.brand} ${currentResult.model} — ${currentResult.confidence}% pewności.`;


    if (navigator.share) {

      try {

        await navigator.share({
          title: "CarScan AI",
          text
        });

      } catch {}

    } else {

      try {

        await navigator.clipboard.writeText(
          text
        );

        showToast(
          "Wynik skopiowany."
        );

      } catch {

        showToast(
          "Udostępnianie nie jest dostępne."
        );

      }

    }

  }
);


/* =========================
   MODAL ZDJĘCIA
========================= */

function setupModal() {

  $("#imageZoomBtn").addEventListener(
    "click",
    () => {

      if (!currentImage) return;

      modalImage.src =
        currentImage;

      imageModal.classList.remove(
        "hidden"
      );

    }
  );


  $("#closeModal").addEventListener(
    "click",
    closeModal
  );


  imageModal.addEventListener(
    "click",
    event => {

      if (
        event.target === imageModal
      ) {
        closeModal();
      }

    }
  );

}


function closeModal() {

  imageModal.classList.add(
    "hidden"
  );

}


/* =========================
   DOUBLE TAP ZOOM
========================= */

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


    lastTouchEnd = now;

  },
  {
    passive: false
  }
);


/* =========================
   POMOCNICZE
========================= */

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}


let toastTimer;

function showToast(message) {

  clearTimeout(toastTimer);

  toastText.textContent =
    message;

  toast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(() => {

      toast.classList.remove(
        "show"
      );

    }, 2400);

}
