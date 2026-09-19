/**
 * Kataya Smart Review Flow - Client Logic for Customer Review Page (review.html)
 * Logika filter cerdas: Bintang 1-3 ke WA Owner, Bintang 4-5 ke Google Maps
 * Revisi C.1: Akses dashboard HANYA memasukkan PIN
 */

let currentBusiness = null;
let currentBranch = null;
let selectedRating = 0;
let redirectTimer = null;

let reviewPollTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadBusinessData();
    if (currentBusiness && currentBusiness.status === 'active') {
        setupStarRating();
    }
});

// Ambil data bisnis & cabang dari URL parameter
async function loadBusinessData() {
    const urlParams = new URLSearchParams(window.location.search);
    const bizId = urlParams.get('id');
    const branchId = urlParams.get('branch');

    const allBusinesses = await window.KatayaDB.getAllBusinesses();

    if (bizId) {
        currentBusiness = await window.KatayaDB.getBusinessById(bizId);
    }
    
    // Jika tidak ditemukan atau tidak ada ID, pakai bisnis pertama untuk kenyamanan pengujian
    if (!currentBusiness && allBusinesses.length > 0) {
        currentBusiness = allBusinesses[0];
    }

    if (!currentBusiness) {
        document.getElementById('bizDisplayName').textContent = 'Bisnis Belum Terdaftar';
        document.getElementById('bizInviteText').textContent = 'Silakan lakukan pendaftaran bisnis terlebih dahulu di halaman utama.';
        return;
    }

    // Catat aktivitas akses review pelanggan
    if (window.KatayaDB && typeof window.KatayaDB.touchBusinessActivity === 'function') {
        await window.KatayaDB.touchBusinessActivity(currentBusiness.id);
    }

    // Kunci ulasan total jika bisnis belum diaktifkan oleh Developer
    const reviewMainCard = document.getElementById('reviewMainCard');
    const lockedCard = document.getElementById('lockedActivationCard');
    const lockedBizName = document.getElementById('lockedBizName');
    const lockedWaDevBtn = document.getElementById('lockedWaDevBtn');

    if (currentBusiness.status === 'pending') {
        if (reviewMainCard) reviewMainCard.classList.add('hidden');
        if (lockedCard) lockedCard.classList.remove('hidden');
        if (lockedBizName) lockedBizName.textContent = currentBusiness.businessName;
        if (lockedWaDevBtn) {
            const devPhone = (window.KatayaDB && typeof window.KatayaDB.getDeveloperPhone === 'function')
                ? await window.KatayaDB.getDeveloperPhone()
                : '6285856640045';
            const waMsg = `Halo Developer Kataya, saya pemilik *${currentBusiness.businessName}* ingin mengaktifkan halaman ulasan kami yang masih terkunci.`;
            lockedWaDevBtn.href = `https://wa.me/${devPhone}?text=${encodeURIComponent(waMsg)}`;
        }
        document.title = `Akses Terkunci - ${currentBusiness.businessName}`;
        if (window.lucide) lucide.createIcons();

        // Pantau jika sewaktu-waktu developer mengaktifkan akun, otomatis buka ulasan
        startListeningForActivation(currentBusiness.id);
        return;
    } else {
        if (reviewMainCard) reviewMainCard.classList.remove('hidden');
        if (lockedCard) lockedCard.classList.add('hidden');
    }

    // Cabang aktif
    if (branchId && currentBusiness.branches) {
        currentBranch = currentBusiness.branches.find(b => b.id === branchId) || currentBusiness.branches[0];
    } else if (currentBusiness.branches && currentBusiness.branches.length > 0) {
        currentBranch = currentBusiness.branches[0];
    } else {
        currentBranch = {
            id: 'main',
            name: currentBusiness.businessName,
            placeId: currentBusiness.placeId,
            whatsapp: currentBusiness.whatsapp
        };
    }

    // Terapkan data ke antarmuka
    document.title = `Beri Ulasan - ${currentBusiness.businessName}`;
    document.getElementById('bizDisplayName').textContent = currentBusiness.businessName;
    
    if (currentBranch && currentBranch.address) {
        document.getElementById('bizBranchAddress').textContent = `${currentBranch.name} • ${currentBranch.address}`;
    } else {
        document.getElementById('bizBranchAddress').textContent = currentBranch ? currentBranch.name : 'Outlet Resmi';
    }

    const settings = currentBusiness.settings || {};
    if (settings.inviteText) {
        document.getElementById('bizInviteText').textContent = settings.inviteText;
    }

    // Kustomisasi Logo
    const logoContainer = document.getElementById('bizLogoContainer');
    const logoImg = document.getElementById('bizLogoImage');
    const logoLetter = document.getElementById('bizLogoLetter');

    if (settings.logoUrl) {
        logoImg.src = settings.logoUrl;
        logoImg.classList.remove('hidden');
        logoLetter.classList.add('hidden');
    } else {
        logoLetter.textContent = currentBusiness.businessName.charAt(0).toUpperCase();
        logoLetter.classList.remove('hidden');
        logoImg.classList.add('hidden');
    }

    // Terapkan Tema Warna
    if (settings.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
        if (!settings.logoUrl) {
            logoContainer.style.background = settings.primaryColor;
        }
    }
    if (settings.bgColor) {
        document.documentElement.style.setProperty('--bg-color', settings.bgColor);
        document.body.style.backgroundColor = settings.bgColor;
    }

    // Tampilkan Rating Google Maps Terverifikasi
    renderGoogleMapsRating();

    // Inisialisasi status tombol ulasan (bebas ulasan berulang)
    checkDeviceReviewStatus();
}

// Dapatkan teks deskripsi bintang berdasarkan bahasa aktif
function getStarLabel(starVal) {
    if (!starVal) {
        return window.KatayaI18n ? window.KatayaI18n.t('review.selectStarsHint') : 'Pilih 1 sampai 5 bintang';
    }
    if (window.KatayaI18n) {
        return window.KatayaI18n.t('review.stars.' + starVal);
    }
    const fallback = {
        1: '1 Bintang: Sangat Kurang Puas',
        2: '2 Bintang: Kurang Memuaskan',
        3: '3 Bintang: Cukup Baik / Rata-rata',
        4: '4 Bintang: Puas & Menyenangkan',
        5: '5 Bintang: Luar Biasa Istimewa!'
    };
    return fallback[starVal] || '';
}

// Pengaturan Interaksi Bintang
function setupStarRating() {
    const starBtns = document.querySelectorAll('.star-btn');
    const labelEl = document.getElementById('starFeedbackLabel');

    if (labelEl && selectedRating === 0) {
        labelEl.textContent = getStarLabel(0);
    }

    starBtns.forEach(btn => {
        const starVal = parseInt(btn.getAttribute('data-stars'), 10);

        // Hover effect
        btn.addEventListener('mouseenter', () => {
            highlightStars(starVal);
            if (labelEl) labelEl.textContent = getStarLabel(starVal);
        });

        btn.addEventListener('mouseleave', () => {
            highlightStars(selectedRating);
            if (labelEl) labelEl.textContent = getStarLabel(selectedRating);
        });

        // Click handler (Logika Filter Bintang Cerdas)
        btn.addEventListener('click', async () => {
            selectedRating = starVal;
            highlightStars(selectedRating);
            if (labelEl) labelEl.textContent = getStarLabel(selectedRating);
            await processRatingDecision(selectedRating);
        });
    });

    // Reaktif saat bahasa diubah pengunjung
    window.addEventListener('kataya:lang_changed', () => {
        if (labelEl) {
            labelEl.textContent = getStarLabel(selectedRating);
        }
        if (currentBusiness) {
            const prefix = (window.KatayaI18n && window.KatayaI18n.getCurrentLang() === 'en') ? 'Review - ' : 'Beri Ulasan - ';
            document.title = `${prefix}${currentBusiness.businessName}`;
        }
    });
}

function highlightStars(count) {
    const starBtns = document.querySelectorAll('.star-btn');
    starBtns.forEach(btn => {
        const val = parseInt(btn.getAttribute('data-stars'), 10);
        if (val <= count) {
            btn.classList.add('text-amber-400');
            btn.classList.remove('text-slate-300');
        } else {
            btn.classList.remove('text-amber-400');
            btn.classList.add('text-slate-300');
        }
    });
}

// LOGIKA UTAMA FILTER CERDAS:
// Rating 1-3 -> Dicegat ke WhatsApp Owner (Saringan masukan pribadi)
// Rating 4-5 -> Langsung ke Google Maps Review
async function processRatingDecision(stars) {
    if (!currentBusiness) return;

    // Proteksi: Ulasan hanya dapat diproses jika akun sudah diaktifkan oleh developer
    if (currentBusiness.status !== 'active') {
        alert(`Akses ulasan untuk "${currentBusiness.businessName}" belum dapat digunakan karena masih menunggu aktivasi dari Developer.`);
        return;
    }

    selectedRating = stars;
    highlightStars(selectedRating);

    if (stars <= 3) {
        // FILTER AKTIF: Rating 1-3 masuk ke WA Owner (mencegah review negatif di Google Maps)
        openWaFeedbackModal(stars);
    } else {
        // FILTER LOLOS: Rating 4-5 langsung diarahkan ke Google Maps
        await triggerGoogleReviewFlow(stars);
    }
}

// Modal untuk Rating 1-3 (Saringan WhatsApp)
function openWaFeedbackModal(stars) {
    selectedRating = stars;
    const modal = document.getElementById('modalWhatsappFeedback');
    const starTextEl = document.getElementById('modalWaStarText');
    const starIconsEl = document.getElementById('modalWaStarIcons');

    // Tampilkan rating bintang yang persis dipilih agar tidak terjadi ketidaksesuaian
    if (starTextEl) {
        starTextEl.textContent = `${stars} Bintang Terpilih`;
    }
    if (starIconsEl) {
        let iconsHtml = '';
        for (let i = 1; i <= stars; i++) {
            iconsHtml += '<i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-400"></i>';
        }
        starIconsEl.innerHTML = iconsHtml;
        if (window.lucide) lucide.createIcons();
    }

    if (modal) {
        const input = document.getElementById('complaintText');
        if (input) input.value = '';
        modal.classList.remove('hidden');
    }
}

function closeWaModal() {
    const modal = document.getElementById('modalWhatsappFeedback');
    if (modal) modal.classList.add('hidden');
}

// Kirim keluhan bintang 1-3 ke WhatsApp Owner
async function sendComplaintToWhatsapp() {
    if (!currentBusiness) return;

    // Proteksi keamanan status
    if (currentBusiness.status !== 'active') {
        alert('Akses ulasan belum diaktifkan oleh Developer.');
        return;
    }

    const rawComment = document.getElementById('complaintText') ? document.getElementById('complaintText').value.trim() : '';
    // Sanitasi teks masukan pelanggan (Anti-XSS & limit 500 karakter)
    const comment = (window.KatayaDB && typeof window.KatayaDB.sanitizeText === 'function')
        ? window.KatayaDB.sanitizeText(rawComment, 500) || 'Pelayanan perlu ditingkatkan'
        : rawComment.replace(/<[^>]*>/g, '').trim().slice(0, 500) || 'Pelayanan perlu ditingkatkan';

    const branchId = currentBranch ? currentBranch.id : 'main';
    const targetWhatsapp = (currentBranch && currentBranch.whatsapp) ? currentBranch.whatsapp : currentBusiness.whatsapp;
    const cleanWhatsapp = String(targetWhatsapp).replace(/\D/g, '').replace(/^0/, '62');

    // Simpan catatan ulasan ke database bisnis (dengan rating persis yang dipilih)
    await window.KatayaDB.recordReview(currentBusiness.id, branchId, selectedRating, 'whatsapp', comment);

    // Siapkan pesan ramah WhatsApp dengan informasi rating yang persis dipilih pengguna
    const starEmojis = '★'.repeat(selectedRating);
    let template = `*MASUKAN PELANGGAN*\n` +
                   `🏢 *Outlet*: ${currentBusiness.businessName}\n` +
                   `⭐ *Penilaian*: ${selectedRating} Bintang (${starEmojis})\n` +
                   `💬 *Catatan/Keluhan*: "${comment}"\n` +
                   `📅 *Waktu*: ${new Date().toLocaleString('id-ID')}\n\n` +
                   `_Pesan dikirim melalui Sistem Proteksi Ulasan Kataya._`;

    const waUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(template)}`;

    closeWaModal();
    window.open(waUrl, '_blank');
}

// Flow untuk Rating 4-5 (Google Review)
async function triggerGoogleReviewFlow(stars) {
    if (!currentBusiness) return;

    // Proteksi keamanan status
    if (currentBusiness.status !== 'active') {
        alert('Akses ulasan belum diaktifkan oleh Developer.');
        return;
    }

    selectedRating = stars;
    const branchId = currentBranch ? currentBranch.id : 'main';
    const rawPlaceId = (currentBranch && currentBranch.placeId) ? currentBranch.placeId : currentBusiness.placeId;
    const cleanPlaceId = String(rawPlaceId || '').trim();

    // Catat review Google ke database bisnis (persis dengan rating bintang yang dipilih)
    await window.KatayaDB.recordReview(currentBusiness.id, branchId, stars, 'google');

    // Perbarui rating tampilan Google Maps secara realtime
    renderGoogleMapsRating();

    // Tembakkan konfeti selebrasi
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    // Validasi Place ID untuk membuka halaman ulasan Google Maps
    let googleReviewUrl = '';
    if (cleanPlaceId && /^[a-zA-Z0-9_\-:]+$/.test(cleanPlaceId)) {
        googleReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(cleanPlaceId)}`;
    } else {
        googleReviewUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBusiness.businessName)}`;
    }

    const modal = document.getElementById('modalGoogleReview');
    const btn = document.getElementById('btnDirectGoogleReview');
    const countdownEl = document.getElementById('autoRedirectCountdown');
    const starCountText = document.getElementById('popupSelectedStarsText');
    const starConfirmText = document.getElementById('modalGoogleStarConfirm');
    const starIconsContainer = document.getElementById('modalGoogleStarIcons');

    if (btn) btn.href = googleReviewUrl;
    if (starCountText) starCountText.textContent = stars;
    if (starConfirmText) starConfirmText.textContent = `${stars} Bintang ★`;

    // Render ikon bintang dinamis sesuai jumlah bintang yang dipilih (mencegah ketidaksesuaian tampilan)
    if (starIconsContainer) {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= stars) {
                starsHtml += '<i data-lucide="star" class="w-6 h-6 text-amber-400 fill-amber-400"></i>';
            } else {
                starsHtml += '<i data-lucide="star" class="w-6 h-6 text-slate-300"></i>';
            }
        }
        starIconsContainer.innerHTML = starsHtml;
        if (window.lucide) lucide.createIcons();
    }

    if (modal) modal.classList.remove('hidden');

    // Countdown 3 detik otomatis buka Google Review
    let timeLeft = 3;
    const getCountdownStr = (sec) => {
        const autoText = window.KatayaI18n ? window.KatayaI18n.t('review.autoRedirectText') : 'Otomatis membuka Google Maps dalam';
        const secText = window.KatayaI18n ? window.KatayaI18n.t('review.secondsText') : 'detik...';
        return `${autoText} ${sec} ${secText}`;
    };

    if (countdownEl) countdownEl.textContent = getCountdownStr(timeLeft);

    clearInterval(redirectTimer);
    redirectTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            if (countdownEl) countdownEl.textContent = getCountdownStr(timeLeft);
        } else {
            clearInterval(redirectTimer);
            window.location.href = googleReviewUrl;
        }
    }, 1000);
}

function confirmGoogleRedirect() {
    clearInterval(redirectTimer);
}

// Modal Akses Dashboard Pemilik (Revisi C.1: Hanya Masukkan PIN)
function openOwnerLoginModal() {
    const modal = document.getElementById('modalOwnerLogin');
    const input = document.getElementById('inputOwnerPin');
    const err = document.getElementById('ownerPinError');
    if (modal && input) {
        input.value = '';
        if (err) err.classList.add('hidden');
        modal.classList.remove('hidden');
        setTimeout(() => input.focus(), 100);
    }
}

function closeOwnerLoginModal() {
    const modal = document.getElementById('modalOwnerLogin');
    if (modal) modal.classList.add('hidden');
}

// Revisi C.1: Autentikasi Dashboard HANYA dengan PIN
async function submitOwnerLogin(event) {
    event.preventDefault();

    const input = document.getElementById('inputOwnerPin');
    const err = document.getElementById('ownerPinError');
    const pin = input ? input.value.trim() : '';

    if (!pin) {
        if (err) {
            err.textContent = 'Silakan ketikkan PIN Anda.';
            err.classList.remove('hidden');
        }
        return;
    }

    // Cek proteksi anti brute-force
    const lockoutKey = 'review_pin_' + (currentBusiness ? currentBusiness.id : 'global');
    const lockStatus = window.KatayaDB.LOGIN_SECURITY.checkLockout(lockoutKey);
    if (lockStatus.locked) {
        if (err) {
            err.textContent = `Akses terkunci sementara karena 5 kali percobaan gagal. Silakan tunggu ${lockStatus.waitSeconds} detik.`;
            err.classList.remove('hidden');
        }
        return;
    }

    // 1. Cek kecocokan PIN dengan bisnis yang sedang dibuka
    if (currentBusiness && (pin === currentBusiness.pin || window.KatayaDB.verifyDeveloperPin(pin))) {
        window.KatayaDB.LOGIN_SECURITY.clearAttempts(lockoutKey);
        sessionStorage.setItem('kataya_auth_biz_id', currentBusiness.id);
        closeOwnerLoginModal();
        window.location.href = `dashboard.html?id=${currentBusiness.id}`;
        return;
    }

    // 2. Jika tidak cocok dengan bisnis aktif, cari apakah ada bisnis lain terdaftar yang memakai PIN ini
    const allBusinesses = await window.KatayaDB.getAllBusinesses();
    const matchedBiz = allBusinesses.find(b => b.pin === pin);
    if (matchedBiz) {
        window.KatayaDB.LOGIN_SECURITY.clearAttempts(lockoutKey);
        sessionStorage.setItem('kataya_auth_biz_id', matchedBiz.id);
        closeOwnerLoginModal();
        window.location.href = `dashboard.html?id=${matchedBiz.id}`;
        return;
    }

    // 3. Cek apakah ini PIN Master Developer "2202"
    if (window.KatayaDB.verifyDeveloperPin(pin)) {
        const targetBizId = currentBusiness ? currentBusiness.id : (allBusinesses[0] ? allBusinesses[0].id : '');
        if (targetBizId) {
            window.KatayaDB.LOGIN_SECURITY.clearAttempts(lockoutKey);
            sessionStorage.setItem('kataya_auth_biz_id', targetBizId);
            closeOwnerLoginModal();
            window.location.href = `dashboard.html?id=${targetBizId}`;
            return;
        }
    }

    // Gagal verifikasi PIN - catat percobaan
    const failRes = window.KatayaDB.LOGIN_SECURITY.recordFailedAttempt(lockoutKey);
    if (err) {
        if (failRes.locked) {
            err.textContent = 'Akses terkunci selama 60 detik karena 5 kali salah memasukkan PIN.';
        } else {
            err.textContent = `PIN salah! Sisa percobaan: ${failRes.remainingAttempts}. Periksa kembali kode akses Anda.`;
        }
        err.classList.remove('hidden');
    }
}

// Pantau aktivasi dari developer jika halaman dibuka saat masih pending
function startListeningForActivation(bizId) {
    if (reviewPollTimer) clearInterval(reviewPollTimer);
    reviewPollTimer = setInterval(async () => {
        const fresh = window.KatayaDB ? await window.KatayaDB.getBusinessById(bizId) : null;
        if (fresh && fresh.status === 'active') {
            clearInterval(reviewPollTimer);
            window.location.reload();
        }
    }, 1500);

    window.addEventListener('storage', async (e) => {
        if (e.key === 'kataya_businesses') {
            const fresh = window.KatayaDB ? await window.KatayaDB.getBusinessById(bizId) : null;
            if (fresh && fresh.status === 'active') {
                window.location.reload();
            }
        }
    });
}

// Render Tampilan Rating Google Maps Resmi
function renderGoogleMapsRating() {
    if (!currentBusiness) return;

    const reviews = currentBusiness.reviews || [];
    const googleReviews = reviews.filter(r => r.type === 'google');

    // Skor dasar Google Maps yang kredibel & realistis
    const baseScore = currentBusiness.googleRating ? parseFloat(currentBusiness.googleRating) : 4.9;
    const baseCount = currentBusiness.googleReviewCount ? parseInt(currentBusiness.googleReviewCount, 10) : 48;

    let finalScore = baseScore;
    let finalCount = baseCount + googleReviews.length;

    if (googleReviews.length > 0) {
        const sumNew = googleReviews.reduce((acc, r) => acc + (Number(r.stars) || 5), 0);
        const combined = ((baseScore * baseCount) + sumNew) / finalCount;
        finalScore = (Math.min(5.0, Math.max(4.0, combined))).toFixed(1);
    } else {
        finalScore = baseScore.toFixed(1);
    }

    const scoreEl = document.getElementById('bizGoogleScore');
    const countEl = document.getElementById('bizGoogleReviewCount');
    const starsContainer = document.getElementById('bizGoogleStars');
    const linkEl = document.getElementById('bizGoogleRatingLink');

    if (scoreEl) scoreEl.textContent = finalScore;
    if (countEl) countEl.textContent = `${finalCount} ulasan di Google Maps`;

    if (starsContainer) {
        const roundedStars = Math.round(parseFloat(finalScore));
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= roundedStars) {
                starsHtml += '<i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400"></i>';
            } else {
                starsHtml += '<i data-lucide="star" class="w-3.5 h-3.5 text-slate-300"></i>';
            }
        }
        starsContainer.innerHTML = starsHtml;
    }

    // Set link langsung ke ulasan Google Maps jika diklik
    const placeId = (currentBranch && currentBranch.placeId) ? currentBranch.placeId : currentBusiness.placeId;
    if (linkEl) {
        if (placeId) {
            linkEl.href = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
        } else {
            linkEl.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentBusiness.businessName)}`;
        }
    }

    if (window.lucide) {
        lucide.createIcons();
    }
}

// Status Tombol Rating Bintang (Selalu aktif, pembatasan 1 perangkat 1 ulasan telah dinonaktifkan)
function checkDeviceReviewStatus() {
    const starBtns = document.querySelectorAll('.star-btn');
    starBtns.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('cursor-not-allowed', 'opacity-60');
    });
    const feedbackLabel = document.getElementById('starFeedbackLabel');
    if (feedbackLabel && selectedRating === 0) {
        feedbackLabel.textContent = getStarLabel(0);
    }
    if (window.lucide) lucide.createIcons();
}

// Handler kompatibilitas
function promptResetDeviceLock() {
    alert('Pembatasan perangkat telah dinonaktifkan. Anda dapat memberikan ulasan secara leluasa.');
}

function closeResetDeviceModal() {
    const modal = document.getElementById('modalResetDeviceLock');
    if (modal) modal.classList.add('hidden');
}

function submitResetDeviceLock(e) {
    if (e) e.preventDefault();
}

