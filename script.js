const gateway = `ws://${window.location.hostname}/ws`;
let websocket;

// Elemen DOM
const statusIndicator = document.getElementById('status-indicator');
const uidText = document.getElementById('uid-text');
const nfcImage = document.getElementById('nfc-image');

// ---- PRELOADING GAMBAR ----
const imageUrls = [
    'default.jpg', // Gambar default (pastikan ini ada di Netlify)
    'gambar1.jpg', // Pastikan ini ada di Netlify
    'gambar2.jpg', // Pastikan ini ada di Netlify
    'gambar3.jpg'  // Pastikan ini ada di Netlify
    // Tambahkan nama file gambar lain di sini jika ada
];
let netlifyBaseUrl = ''; // Akan diisi otomatis dari src gambar default

function preloadImages(baseUrl) {
    if (!baseUrl) {
        console.error("Base URL for preloading is missing!");
        return;
    }
    console.log('Preloading images from:', baseUrl);
    imageUrls.forEach(filename => {
        const img = new Image();
        // Pastikan URL valid
        if (filename) {
             img.src = `${baseUrl}/${filename}`;
             // console.log(`Preloading: ${img.src}`); // Uncomment for debugging preload URLs
        } else {
            console.warn("Empty filename encountered during preload.");
        }
    });
}
// ------------------------------------

// Fungsi untuk mengganti gambar dengan efek fade
function changeImageWithFade(newSrc) {
    // Pastikan newSrc valid sebelum melanjutkan
    if (!newSrc || typeof newSrc !== 'string') {
        console.error('Invalid image source provided for fade effect:', newSrc);
        return;
    }

    // Hanya lakukan fade jika URL benar-benar berbeda
    if (nfcImage.src === newSrc) {
        // console.log("Source is the same, skipping fade."); // Uncomment for debugging
        return;
    }

    // 1. Mulai fade out gambar saat ini
    nfcImage.classList.add('fade-out');

    // 2. Tunggu transisi fade-out selesai (sesuai durasi di CSS, misal 500ms)
    setTimeout(() => {
        // 3. Ganti sumber gambar
        nfcImage.src = newSrc;

        // Penting: Tambahkan event listener untuk memastikan gambar baru sudah dimuat sebelum fade-in
        nfcImage.onload = () => {
            // 4. Hapus class fade-out agar gambar baru muncul (fade-in)
            // Beri sedikit delay agar browser sempat memproses pergantian src sepenuhnya
            setTimeout(() => {
                 nfcImage.classList.remove('fade-out');
                 nfcImage.onload = null; // Hapus listener setelah selesai
            }, 50); // Delay kecil 50ms
        };
        // Handle jika gambar gagal dimuat
        nfcImage.onerror = () => {
             console.error(`Gagal memuat gambar: ${newSrc}`);
             // Mungkin tampilkan gambar placeholder atau pesan error di sini
             nfcImage.classList.remove('fade-out'); // Tetap tampilkan (mungkin gambar lama atau rusak)
             nfcImage.onload = null; // Hapus listener
             nfcImage.onerror = null;
        }

    }, 500); // Harus cocok dengan durasi transisi opacity di CSS
}


// Fungsi untuk memulai koneksi WebSocket
function initWebSocket() {
    console.log(`Mencoba membuka WebSocket ke ${gateway}...`);
    try {
        websocket = new WebSocket(gateway);
        websocket.onopen = onOpen;
        websocket.onclose = onClose;
        websocket.onerror = onError; // Tambah handler error
        websocket.onmessage = onMessage;
    } catch (error) {
        console.error("Gagal membuat WebSocket:", error);
        // Mungkin tampilkan pesan error ke pengguna
        statusIndicator.classList.remove('connected');
        statusIndicator.classList.add('disconnected');
        statusIndicator.title = 'Gagal membuat koneksi WebSocket.';
        uidText.textContent = "Error Koneksi";
        // Coba lagi nanti
        setTimeout(initWebSocket, 5000); // Coba lagi setelah 5 detik jika gagal total
    }
}

// Dipanggil saat koneksi berhasil dibuka
function onOpen(event) {
    console.log('Koneksi WebSocket dibuka.');
    statusIndicator.classList.remove('disconnected');
    statusIndicator.classList.add('connected');
    statusIndicator.title = 'Terhubung ke ESP32'; // Tooltip
}

// Dipanggil saat koneksi ditutup
function onClose(event) {
    console.log(`Koneksi WebSocket ditutup. Code: ${event.code}, Reason: ${event.reason}`);
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusIndicator.title = 'Terputus. Mencoba menyambung ulang...'; // Tooltip
    uidText.textContent = "Koneksi terputus..."; // Info di footer
    // Coba hubungkan kembali setelah 2 detik
    setTimeout(initWebSocket, 2000);
}

// Dipanggil jika ada error WebSocket
function onError(event) {
    console.error('WebSocket Error:', event);
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusIndicator.title = 'Error koneksi WebSocket.'; // Tooltip
    // onClose akan dipanggil setelah ini (atau seharusnya), jadi reconnection ditangani di sana
}


// Dipanggil saat menerima data dari server (ESP32)
function onMessage(event) {
    // console.log('Menerima data:', event.data); // Kurangi log agar tidak terlalu ramai
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (e) {
        console.error('Gagal parsing JSON:', event.data, e);
        return;
    }

    // Update UID di footer
    if (data.uid) {
        if(data.uid === "NONE") {
            uidText.textContent = "Tempelkan kartu...";
            uidText.title = ""; // Hapus tooltip
        } else {
            // Hanya tampilkan 4 karakter terakhir untuk ringkas
            const shortUid = data.uid.slice(-4);
            uidText.textContent = `UID: ...${shortUid}`;
            uidText.title = `UID Lengkap: ${data.uid}`; // Tampilkan lengkap di tooltip
        }
    }

    // Ganti gambar jika URL diterima dan valid (dengan efek fade)
    if (data.image && typeof data.image === 'string' && data.image.startsWith('http')) {
        // console.log(`Mengganti gambar ke: ${data.image}`); // Kurangi log
        changeImageWithFade(data.image);
    } else if (data.image) {
        console.warn('Menerima URL gambar tidak valid:', data.image);
    }
}

// Mulai koneksi & preloading saat halaman dimuat
window.addEventListener('load', () => {
    // Ambil base URL dari src gambar default di HTML
    const defaultImageSrc = nfcImage.src;
    if (defaultImageSrc && defaultImageSrc.includes('/')) {
        // Hapus nama file untuk mendapatkan base URL
        netlifyBaseUrl = defaultImageSrc.substring(0, defaultImageSrc.lastIndexOf('/'));
    } else {
        console.error("Tidak bisa mendapatkan base URL Netlify dari src gambar default:", defaultImageSrc);
        // Fallback jika gagal, mungkin hardcode URL Netlify di sini jika perlu
        // netlifyBaseUrl = "https://aac-job.netlify.app";
    }


    if (netlifyBaseUrl) {
        preloadImages(netlifyBaseUrl);
    } else {
        console.error("Preloading dibatalkan karena base URL tidak valid.");
    }

    // Beri sedikit jeda sebelum memulai WebSocket, biarkan preload berjalan
    setTimeout(initWebSocket, 100);
});

