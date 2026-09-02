// ======================================================
// CARSCAN AI
// ======================================================
// ================= AUTH =================
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
// ================= STORAGE =================
function getUsers() {
    return JSON.parse(
        localStorage.getItem("carscan_users") || "[]"
    );
}
function saveUsers(users) {
    localStorage.setItem(
        "carscan_users",
        JSON.stringify(users)
    );
}
function getCurrentUser() {
    return JSON.parse(
        localStorage.getItem("carscan_current_user") || "null"
    );
}
function setCurrentUser(user) {
    localStorage.setItem(
        "carscan_current_user",
        JSON.stringify(user)
    );
}
// ================= TOAST =================
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}
// ================= LOGIN / REGISTER SWITCH =================
showRegister.addEventListener("click", () => {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
});
showLogin.addEventListener("click", () => {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
});
// ================= REGISTER =================
registerBtn.addEventListener("click", () => {
    const name =
        document.getElementById("registerName").value.trim();
    const email =
        document.getElementById("registerEmail").value.trim().toLowerCase();
    const password =
        document.getElementById("registerPassword").value;
    const password2 =
        document.getElementById("registerPassword2").value;
    if (!name || !email || !password || !password2) {
        showToast("Wypełnij wszystkie pola.");
        return;
    }
    if (password.length < 6) {
        showToast("Hasło musi mieć minimum 6 znaków.");
        return;
    }
    if (password !== password2) {
        showToast("Hasła nie są takie same.");
        return;
    }
    const users = getUsers();
    if (users.some(user => user.email === email)) {
        showToast("Konto z tym adresem już istnieje.");
        return;
    }
    const user = {
        id: Date.now(),
        name,
        email,
        password,
        history: [],
        favorites: []
    };
    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    showToast("Konto utworzone!");
    setTimeout(openApp, 400);
});
// ================= LOGIN =================
loginBtn.addEventListener("click", () => {
    const email =
        document.getElementById("loginEmail").value.trim().toLowerCase();
    const password =
        document.getElementById("loginPassword").value;
    const users = getUsers();
    const user = users.find(
        item =>
            item.email === email &&
            item.password === password
    );
    if (!user) {
        showToast("Nieprawidłowy email lub hasło.");
        return;
    }
    setCurrentUser(user);
    showToast("Zalogowano!");
    setTimeout(openApp, 400);
});
// ================= OPEN APP =================
function openApp() {
    const user = getCurrentUser();
    if (!user) return;
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    document.getElementById("welcomeText").textContent =
        `Witaj, ${user.name}!`;
    document.getElementById("profileName").textContent =
        user.name;
    document.getElementById("profileEmail").textContent =
        user.email;
    document.getElementById("profileAvatar").textContent =
        user.name.charAt(0).toUpperCase();
    renderHistory();
    renderFavorites();
}
// ================= LOGOUT =================
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("carscan_current_user");
    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
    showToast("Wylogowano.");
});
// ================= NAVIGATION =================
const navItems =
    document.querySelectorAll(".nav-item");
const pages =
    document.querySelectorAll(".page");
navItems.forEach(item => {
    item.addEventListener("click", () => {
        const pageId =
            item.dataset.page;
        pages.forEach(page => {
            page.classList.add("hidden");
        });
        document.getElementById(pageId)
            .classList.remove("hidden");
        navItems.forEach(nav => {
            nav.classList.remove("active");
        });
        item.classList.add("active");
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
});
// ================= THEME =================
const themeBtn =
    document.getElementById("themeBtn");
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const light =
        document.body.classList.contains("light");
    themeBtn.textContent =
        light ? "🌙" : "☀️";
    localStorage.setItem(
        "carscan_theme",
        light ? "light" : "dark"
    );
});
if (localStorage.getItem("carscan_theme") === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "🌙";
}
// ================= FILES =================
const cameraInput =
    document.getElementById("cameraInput");
const galleryInput =
    document.getElementById("galleryInput");
const cameraBtn =
    document.getElementById("cameraBtn");
const galleryBtn =
    document.getElementById("galleryBtn");
const dropZone =
    document.getElementById("dropZone");
const uploadContent =
    document.getElementById("uploadContent");
const previewContainer =
    document.getElementById("previewContainer");
const preview =
    document.getElementById("preview");
const removeBtn =
    document.getElementById("removeBtn");
const scanBtn =
    document.getElementById("scanBtn");
let selectedFile = null;
cameraBtn.addEventListener(
    "click",
    () => cameraInput.click()
);
galleryBtn.addEventListener(
    "click",
    () => galleryInput.click()
);
cameraInput.addEventListener(
    "change",
    e => handleFile(e.target.files[0])
);
galleryInput.addEventListener(
    "change",
    e => handleFile(e.target.files[0])
);
// ================= HANDLE FILE =================
function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        showToast("Wybierz zdjęcie.");
        return;
    }
    selectedFile = file;
    const reader =
        new FileReader();
    reader.onload = e => {
        preview.src = e.target.result;
        document.getElementById("resultImage").src =
            e.target.result;
        uploadContent.classList.add("hidden");
        previewContainer.classList.remove("hidden");
        scanBtn.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
}
// ================= REMOVE =================
removeBtn.addEventListener("click", () => {
    resetScanner();
});
// ================= DRAG DROP =================
dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
});
// ================= SCAN =================
scanBtn.addEventListener("click", startRecognition);
function startRecognition() {
    scanBtn.classList.add("hidden");
    document.getElementById("loading")
        .classList.remove("hidden");
    document.getElementById("result")
        .classList.add("hidden");
    let progress = 0;
    const progressBar =
        document.getElementById("progressBar");
    progressBar.style.width = "0%";
    const interval =
        setInterval(() => {
            progress += Math.floor(
                Math.random() * 10
            ) + 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                progressBar.style.width =
                    "100%";
                setTimeout(
                    showDemoResult,
                    400
                );
            } else {
                progressBar.style.width =
                    progress + "%";
            }
        }, 180);
}
// ================= DEMO RESULT =================
function showDemoResult() {
    document.getElementById("loading")
        .classList.add("hidden");
    document.getElementById("carName")
        .textContent =
        "Samochód do rozpoznania";
    document.getElementById("brand")
        .textContent = "—";
    document.getElementById("model")
        .textContent = "—";
    document.getElementById("generation")
        .textContent = "—";
    document.getElementById("body")
        .textContent = "—";
    document.getElementById("drive")
        .textContent = "—";
    document.getElementById("engine")
        .textContent = "—";
    document.getElementById("confidence")
        .textContent = "AI";
    document.getElementById("result")
        .classList.remove("hidden");
    saveHistory();
    document.getElementById("result")
        .scrollIntoView({
            behavior: "smooth"
        });
}
// ================= HISTORY =================
function saveHistory() {
    const user = getCurrentUser();
    if (!user || !selectedFile) return;
    const item = {
        id: Date.now(),
        name: "Samochód do rozpoznania",
        image: preview.src,
        date: new Date().toLocaleString("pl-PL")
    };
    user.history =
        user.history || [];
    user.history.unshift(item);
    updateUser(user);
    renderHistory();
}
// ================= UPDATE USER =================
function updateUser(user) {
    const users = getUsers();
    const index =
        users.findIndex(
            item => item.id === user.id
        );
    if (index !== -1) {
        users[index] = user;
        saveUsers(users);
        setCurrentUser(user);
    }
}
// ================= RENDER HISTORY =================
function renderHistory() {
    const user = getCurrentUser();
    if (!user) return;
    const list =
        document.getElementById("historyList");
    const empty =
        document.getElementById("emptyHistory");
    list.innerHTML = "";
    if (!user.history || user.history.length === 0) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");
    user.history.forEach(item => {
        const element =
            document.createElement("div");
        element.className =
            "history-item";
        element.innerHTML = `
            <img src="${item.image}" alt="Auto">
            <div class="history-info">
                <h3>${item.name}</h3>
                <p>${item.date}</p>
            </div>
            <button class="delete-history"
                data-id="${item.id}">
                🗑️
            </button>
        `;
        list.appendChild(element);
    });
    document
        .querySelectorAll(".delete-history")
        .forEach(button => {
            button.addEventListener("click", () => {
                deleteHistory(
                    Number(button.dataset.id)
                );
            });
        });
}
// ================= DELETE HISTORY =================
function deleteHistory(id) {
    const user = getCurrentUser();
    user.history =
        user.history.filter(
            item => item.id !== id
        );
    updateUser(user);
    renderHistory();
    showToast("Usunięto skan.");
}
// ================= CLEAR HISTORY =================
document
    .getElementById("clearHistoryBtn")
    .addEventListener("click", () => {
        const user = getCurrentUser();
        if (!user) return;
        user.history = [];
        updateUser(user);
        renderHistory();
        showToast("Historia została wyczyszczona.");
    });
// ================= FAVORITES =================
document
    .getElementById("favoriteBtn")
    .addEventListener("click", () => {
        const user = getCurrentUser();
        if (!user) return;
        user.favorites =
            user.favorites || [];
        const favorite = {
            id: Date.now(),
            name:
                document.getElementById("carName")
                    .textContent,
            image:
                document.getElementById("resultImage")
                    .src
        };
        user.favorites.unshift(favorite);
        updateUser(user);
        renderFavorites();
        showToast("Dodano do ulubionych ⭐");
    });
// ================= RENDER FAVORITES =================
function renderFavorites() {
    const user = getCurrentUser();
    if (!user) return;
    const list =
        document.getElementById("favoritesList");
    const empty =
        document.getElementById("emptyFavorites");
    list.innerHTML = "";
    if (!user.favorites ||
        user.favorites.length === 0) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");
    user.favorites.forEach(item => {
        const element =
            document.createElement("div");
        element.className =
            "history-item";
        element.innerHTML = `
            <img src="${item.image}" alt="Auto">
            <div class="history-info">
                <h3>${item.name}</h3>
                <p>⭐ Ulubione</p>
            </div>
        `;
        list.appendChild(element);
    });
}
// ================= NEW SCAN =================
document
    .getElementById("newScanBtn")
    .addEventListener("click", resetScanner);
function resetScanner() {
    selectedFile = null;
    cameraInput.value = "";
    galleryInput.value = "";
    preview.src = "";
    previewContainer.classList.add("hidden");
    uploadContent.classList.remove("hidden");
    scanBtn.classList.add("hidden");
    document.getElementById("loading")
        .classList.add("hidden");
    document.getElementById("result")
        .classList.add("hidden");
    document.getElementById("progressBar")
        .style.width = "0%";
}
// ================= AUTO LOGIN =================
if (getCurrentUser()) {
    openApp();
}
