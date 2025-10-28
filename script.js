// Alamat WebSocket akan otomatis menggunakan IP dari ESP32
// karena halaman index.html-nya dibuka dari sana.
const gateway = `ws://${window.location.hostname}/ws`;
let websocket;

// Elemen DOM
const statusIndicator = document.getElementById('status-indicator');
const uidText = document.getElementById('uid-text');
const nfcImage = document.getElementById('nfc-image');

// --- 💡 TAMBAHAN UNTUK PRELOADING "NO DELAY" ---
const netlifyBaseUrl = "https://aac-job.netlify.app"; // URL Netlify Anda
const imagesToPreload = [
    "/gambar1.jpg",
    "/gambar2.jpg",
    "/gambar3.jpg",
    "/default.jpg"
    // Tambahkan gambar lain di sini jika ada (misal: "/gambar4.jpg")
];

/**
 * Mengunduh semua gambar ke cache browser di latar belakang.
 */
function preloadImages() {
    console.log("Mulai preloading gambar...");
    imagesToPreload.forEach(imgUrl => {
        const img = new Image(); // Buat elemen gambar baru
        img.src = netlifyBaseUrl + imgUrl; // Set sumbernya
        img.onload = () => console.log(`Gambar ${imgUrl} berhasil dimuat.`);
        img.onerror = () => console.error(`Gagal memuat ${imgUrl}.`);
    });
}
// --- AKHIR TAMBAHAN ---


// Fungsi untuk memulai koneksi WebSocket
function initWebSocket() {
    console.log('Mencoba membuka WebSocket...');
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}

// Dipanggil saat koneksi berhasil dibuka
function onOpen(event) {
    console.log('Koneksi WebSocket dibuka.');
    statusIndicator.classList.remove('disconnected');
    statusIndicator.classList.add('connected');
}

// Dipanggil saat koneksi ditutup
function onClose(event) {
    console.log('Koneksi WebSocket ditutup.');
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    // Coba hubungkan kembali setelah 2 detik
    setTimeout(initWebSocket, 2000);
}

// Dipanggil saat menerima data dari server (ESP32)
function onMessage(event) {
    console.log('Menerima data:', event.data);
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (e) {
        console.error('Gagal parsing JSON:', e);
        return;
    }

    if (data.uid) {
        if(data.uid === "NONE") {
            uidText.textContent = "Tempelkan kartu...";
        } else {
            uidText.textContent = `UID: ${data.uid}`;
        }
    }
    
    if (data.image) {
        // Langsung gunakan URL lengkap dari JSON
        // Ini akan instan karena gambar sudah ada di cache
        nfcImage.src = data.image; 
    }
}

// Mulai koneksi saat halaman dimuat
window.addEventListener('load', () => {
    initWebSocket();
    preloadImages(); // 💡 Panggil fungsi preload saat halaman dimuat
});
