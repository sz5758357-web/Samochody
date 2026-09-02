const cameraInput = document.getElementById("cameraInput");
const galleryInput = document.getElementById("galleryInput");
const cameraBtn = document.getElementById("cameraBtn");
const galleryBtn = document.getElementById("galleryBtn");
const dropZone = document.getElementById("dropZone");
const uploadContent = document.getElementById("uploadContent");
const previewContainer = document.getElementById("previewContainer");
const preview = document.getElementById("preview");
const removeBtn = document.getElementById("removeBtn");
const scanBtn = document.getElementById("scanBtn");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const resultImage = document.getElementById("resultImage");
const progressBar = document.getElementById("progressBar");
const newScanBtn = document.getElementById("newScanBtn");
const themeBtn = document.getElementById("themeBtn");
let selectedFile = null;
// ================================
// APARAT
// ================================
cameraBtn.addEventListener("click", () => {
    cameraInput.click();
});
// ================================
// GALERIA
// ================================
galleryBtn.addEventListener("click", () => {
    galleryInput.click();
});
// ================================
// WYBÓR PLIKU
// ================================
cameraInput.addEventListener("change", event => {
    handleFile(event.target.files[0]);
});
galleryInput.addEventListener("change", event => {
    handleFile(event.target.files[0]);
});
// ================================
// OBSŁUGA PLIKU
// ================================
function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        alert("Wybierz plik graficzny.");
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = event => {
        preview.src = event.target.result;
        resultImage.src = event.target.result;
        uploadContent.classList.add("hidden");
        previewContainer.classList.remove("hidden");
        scanBtn.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}
// ================================
// USUWANIE ZDJĘCIA
// ================================
removeBtn.addEventListener("click", event => {
    event.stopPropagation();
    resetScanner();
});
// ================================
// DRAG & DROP
// ================================
dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    const file = event.dataTransfer.files[0];
    handleFile(file);
});
// ================================
// ROZPOZNAWANIE
// ================================
scanBtn.addEventListener("click", () => {
    if (!selectedFile) return;
    startRecognition();
});
function startRecognition() {
    scanBtn.classList.add("hidden");
    loading.classList.remove("hidden");
    result.classList.add("hidden");
    let progress = 0;
    progressBar.style.width = "0%";
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            progressBar.style.width = "100%";
            setTimeout(() => {
                loading.classList.add("hidden");
                showDemoResult();
            }, 400);
        } else {
            progressBar.style.width = progress + "%";
        }
    }, 180);
}
// ================================
// WYNIK DEMO
// ================================
//
// Na tym etapie wynik jest przykładowy.
// Później podłączymy tutaj prawdziwe AI.
//
function showDemoResult() {
    document.getElementById("carName").textContent =
        "Przykładowy samochód";
    document.getElementById("brand").textContent =
        "—";
    document.getElementById("model").textContent =
        "—";
    document.getElementById("generation").textContent =
        "—";
    document.getElementById("body").textContent =
        "—";
    document.getElementById("drive").textContent =
        "—";
    document.getElementById("engine").textContent =
        "—";
    document.getElementById("confidence").textContent =
        "AI";
    resultImage.src = preview.src;
    result.classList.remove("hidden");
    result.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}
// ================================
// NOWE SKANOWANIE
// ================================
newScanBtn.addEventListener("click", () => {
    resetScanner();
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
// ================================
// RESET
// ================================
function resetScanner() {
    selectedFile = null;
    cameraInput.value = "";
    galleryInput.value = "";
    preview.src = "";
    previewContainer.classList.add("hidden");
    uploadContent.classList.remove("hidden");
    scanBtn.classList.add("hidden");
    loading.classList.add("hidden");
    result.classList.add("hidden");
    progressBar.style.width = "0%";
}
// ================================
// MOTYW
// ================================
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const light = document.body.classList.contains("light");
    themeBtn.textContent = light ? "🌙" : "☀️";
    localStorage.setItem("carscan-theme", light ? "light" : "dark");
});
// ================================
// WCZYTANIE MOTYWU
// ================================
const savedTheme = localStorage.getItem("carscan-theme");
if (savedTheme === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "🌙";
}
// ================================
// KLAWISZ ESC
// ================================
document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        resetScanner();
    }
});
