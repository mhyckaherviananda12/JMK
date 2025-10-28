const gateway = `ws://${window.location.hostname}/ws`;
let websocket;

// Elemen DOM
const statusIndicator = document.getElementById('status-indicator');
const uidText = document.getElementById('uid-text');
const nfcVideo = document.getElementById('nfc-video'); // Ganti ke ID video
let currentVideoSrc = nfcVideo ? nfcVideo.src : ''; // Simpan src saat ini

// --- Fungsi untuk mengganti video ---
function changeVideoSource(newSrc) {
    if (!nfcVideo) {
        console.error("Elemen video tidak ditemukan!");
        return;
    }
    if (!newSrc || typeof newSrc !== 'string' || !newSrc.startsWith('http')) {
        console.error('URL video baru tidak valid:', newSrc);
        return;
    }

    // Hanya ganti jika URL berbeda
    if (currentVideoSrc === newSrc) {
        // Jika URL sama, pastikan video diputar ulang dari awal (jika perlu)
        // nfcVideo.currentTime = 0;
        // nfcVideo.play().catch(e => console.warn("Replay error:", e));
        // console.log("Video source sama, tidak diganti.");
        return;
    }

    console.log(`Mengganti video ke: ${newSrc}`);
    currentVideoSrc = newSrc; // Update src saat ini

    // Ganti source
    nfcVideo.src = newSrc;

    // Muat sumber baru
    nfcVideo.load();

    // Coba putar setelah sumber dimuat (browser modern mungkin perlu interaksi pengguna jika tidak muted)
    // Karena kita 'muted', autoplay seharusnya bekerja, tapi play() bisa membantu
    // Menggunakan event 'canplay' lebih aman
    nfcVideo.oncanplay = () => {
        nfcVideo.play().catch(error => {
            console.warn("Autoplay dicegah atau gagal:", error);
            // Anda bisa menampilkan tombol play manual di sini jika autoplay gagal
        });
        nfcVideo.oncanplay = null; // Hapus listener setelah dijalankan
    };
    // Timeout fallback jika canplay tidak terpicu (jarang terjadi)
    const playTimeout = setTimeout(() => {
         nfcVideo.play().catch(e => console.warn("Fallback play error:", e));
         nfcVideo.oncanplay = null; // Pastikan listener dihapus
    }, 1000); // Coba putar setelah 1 detik

     // Hapus timeout jika canplay terpicu
     nfcVideo.addEventListener('canplay', () => clearTimeout(playTimeout), { once: true });


    // --- Logika Fade (Opsional untuk Video) ---
    // Efek fade mungkin kurang mulus dengan video loading, bisa dihapus jika jelek
    /*
    nfcVideo.classList.add('fade-out');
    setTimeout(() => {
        nfcVideo.src = newSrc;
        nfcVideo.load();
        nfcVideo.oncanplay = () => { // Tunggu video siap
             setTimeout(() => {
                  nfcVideo.classList.remove('fade-out');
                  nfcVideo.play().catch(e => console.warn("Autoplay error:", e));
                  nfcVideo.oncanplay = null;
             }, 50);
        };
         nfcVideo.onerror = () => { // Handle error loading
              console.error(`Gagal memuat video: ${newSrc}`);
              nfcVideo.classList.remove('fade-out');
              nfcVideo.oncanplay = null;
              nfcVideo.onerror = null;
         }
    }, 300); // Sesuaikan durasi fade out
    */
}


// --- WebSocket Functions (Sama seperti sebelumnya, tapi panggil changeVideoSource) ---

function initWebSocket() {
    console.log(`Mencoba membuka WebSocket ke ${gateway}...`);
    // ... (kode try-catch WebSocket sama seperti sebelumnya) ...
    try {
        websocket = new WebSocket(gateway);
        websocket.onopen = onOpen;
        websocket.onclose = onClose;
        websocket.onerror = onError;
        websocket.onmessage = onMessage;
    } catch (error) {
        console.error("Gagal membuat WebSocket:", error);
        statusIndicator.classList.remove('connected');
        statusIndicator.classList.add('disconnected');
        statusIndicator.title = 'Gagal membuat koneksi WebSocket.';
        uidText.textContent = "Error Koneksi";
        setTimeout(initWebSocket, 5000);
    }
}

function onOpen(event) {
    console.log('Koneksi WebSocket dibuka.');
    statusIndicator.classList.remove('disconnected');
    statusIndicator.classList.add('connected');
    statusIndicator.title = 'Terhubung ke ESP32';
}

function onClose(event) {
    console.log(`Koneksi WebSocket ditutup. Code: ${event.code}, Reason: ${event.reason}`);
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusIndicator.title = 'Terputus. Mencoba menyambung ulang...';
    uidText.textContent = "Koneksi terputus...";
    setTimeout(initWebSocket, 2000);
}

function onError(event) {
    console.error('WebSocket Error:', event);
    statusIndicator.classList.remove('connected');
    statusIndicator.classList.add('disconnected');
    statusIndicator.title = 'Error koneksi WebSocket.';
}

function onMessage(event) {
    let data;
    try {
        data = JSON.parse(event.data);
    } catch (e) {
        console.error('Gagal parsing JSON:', event.data, e);
        return;
    }

    // Update UID
    if (data.uid) {
        if (data.uid === "NONE") {
            uidText.textContent = "Tempelkan kartu...";
            uidText.title = "";
        } else {
            const shortUid = data.uid.slice(-4);
            uidText.textContent = `UID: ...${shortUid}`;
            uidText.title = `UID Lengkap: ${data.uid}`;
        }
    }

    // Ganti video jika URL diterima
    if (data.image) { // ESP8266 masih mengirim key "image", kita gunakan saja
        changeVideoSource(data.image); // Panggil fungsi pengganti video
    }
}

// Mulai koneksi saat halaman dimuat
window.addEventListener('load', () => {
    // Validasi elemen video
    if (!nfcVideo) {
         console.error("Elemen video #nfc-video tidak ditemukan saat load!");
         uidText.textContent = "Error: Elemen Video Hilang";
         return; // Hentikan jika elemen krusial tidak ada
    }
    // Set src awal lagi untuk memastikan
    currentVideoSrc = nfcVideo.src;
    console.log("Video awal:", currentVideoSrc);

    // Pastikan video awal coba diputar (jika autoplay di HTML gagal)
    nfcVideo.play().catch(error => {
        console.warn("Initial autoplay mungkin dicegah:", error);
        // Mungkin perlu tombol 'Mulai' jika autoplay awal diblokir
    });


    // Mulai WebSocket
    setTimeout(initWebSocket, 100);
});

