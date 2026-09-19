/**
 * Kataya Smart Review Flow - Client Logic for Index & Registration Page
 * Menangani pemilihan paket otomatis dari URL, modal pembayaran privat, dan aktivasi via WhatsApp.
 */

let newlyRegisteredBiz = null;
let lastRenderedBusinessesHash = '';

document.addEventListener('DOMContentLoaded', async () => {
    checkPackageFromUrl();
    checkStandeeFromUrl();
    await checkWaitParamFromUrl();
    setupRegistrationForm();
    setupHomeLoginForm();
    await renderRegisteredBusinesses();

    // Pembaruan data otomatis secara real-time (Storage Event & Polling Interval)
    window.addEventListener('storage', async () => await renderRegisteredBusinesses());
    setInterval(async () => await renderRegisteredBusinesses(), 1500);
});

// Baca parameter ?standee= untuk klaim barcode meja fisik calon mitra
function checkStandeeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const standeeParam = urlParams.get('standee');

    if (standeeParam) {
        const cleanCode = standeeParam.toUpperCase().trim();
        const inputStandee = document.getElementById('inputStandeeCode');
        const banner = document.getElementById('standeeClaimBanner');
        const bannerCode = document.getElementById('bannerStandeeCode');

        if (inputStandee) inputStandee.value = cleanCode;
        if (banner) banner.classList.remove('hidden');
        if (bannerCode) bannerCode.textContent = cleanCode;

        if (window.lucide) lucide.createIcons();

        // Smooth scroll ke area form pendaftaran
        const formSection = document.getElementById('formSection');
        if (formSection) {
            setTimeout(() => {
                formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
}

// 2. Baca URL parameter ?package= dan pilih radio paket secara otomatis
function checkPackageFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const packageParam = urlParams.get('package');

    if (packageParam) {
        const radioTarget = document.querySelector(`input[name="packageType"][value="${packageParam}"]`);
        if (radioTarget) {
            radioTarget.checked = true;

            // Smooth scroll ke area form pendaftaran jika datang dari halaman paket
            const formSection = document.getElementById('formSection');
            if (formSection) {
                setTimeout(() => {
                    formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 200);
            }
        }
    }
}

// Handler Form Pendaftaran Bisnis (Bagian A)
function setupRegistrationForm() {
    const form = document.getElementById('formRegister');
    if (!form) return;

    const placeIdInput = document.getElementById('inputPlaceId');
    if (placeIdInput) {
        placeIdInput.addEventListener('input', (e) => {
            let val = e.target.value.trim();
            if (val.includes('placeid=')) {
                const match = val.match(/placeid=([^&]+)/);
                if (match && match[1]) {
                    e.target.value = match[1];
                }
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameEl = document.getElementById('inputBusinessName') || document.getElementById('inputName');
        const businessName = nameEl ? nameEl.value.trim() : '';

        const typeEl = document.getElementById('inputType');
        const businessType = typeEl ? typeEl.value.trim() : '';

        const placeIdEl = document.getElementById('inputPlaceId');
        let placeId = placeIdEl ? placeIdEl.value.trim() : '';

        const whatsappEl = document.getElementById('inputWhatsapp');
        const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';

        const pinEl = document.getElementById('inputPin');
        const pin = pinEl ? pinEl.value.trim() : '';
        
        // Ambil paket yang dipilih
        const packageRadio = document.querySelector('input[name="packageType"]:checked');
        const packageType = packageRadio ? packageRadio.value : 'single';

        if (!businessName || !placeId || !whatsapp) {
            alert('Mohon lengkapi semua kolom pendaftaran yang wajib diisi!');
            return;
        }

        // Validasi nomor WhatsApp
        const cleanWa = whatsapp.replace(/\D/g, '');
        if (cleanWa.length < 8) {
            alert('Nomor WhatsApp yang Anda masukkan tidak valid (minimal 8 angka).');
            return;
        }

        // Ekstrak placeId jika pengguna menempelkan tautan lengkap
        if (placeId.includes('placeid=')) {
            const urlParams = new URLSearchParams(placeId.split('?')[1] || '');
            if (urlParams.has('placeid')) {
                placeId = urlParams.get('placeid');
            } else {
                const match = placeId.match(/placeid=([^&]+)/);
                if (match) placeId = match[1];
            }
        }

        // Ambil kode standee jika berasal dari scan barcode meja
        const standeeCodeInput = document.getElementById('inputStandeeCode');
        const standeeCode = standeeCodeInput ? standeeCodeInput.value.trim().toUpperCase() : '';

        // Daftarkan bisnis dengan status 'pending' (Aktivasi 1x pakai)
        newlyRegisteredBiz = await window.KatayaDB.registerBusiness({
            businessName,
            businessType: businessType || 'Kuliner (F&B)',
            placeId,
            whatsapp,
            pin: pin || '1234',
            packageType,
            standeeCode: standeeCode || undefined
        });

        // Hubungkan standee fisik ke bisnis jika ada
        if (standeeCode && window.KatayaDB && typeof window.KatayaDB.linkStandeeToBusiness === 'function') {
            await window.KatayaDB.linkStandeeToBusiness(standeeCode, newlyRegisteredBiz.id);
        }

        // Perbarui daftar di beranda secara langsung
        await renderRegisteredBusinesses();

        // Buka Modal Metode Pembayaran Resmi
        showPaymentModal(newlyRegisteredBiz);
        form.reset();
    });
}

// Buka Modal Metode Pembayaran (Tanpa menampilkan nomor rekening langsung di layar)
function showPaymentModal(biz) {
    const modal = document.getElementById('modalPaymentMethods');
    if (!modal || !biz) return;

    const packageDescriptions = {
        single: 'Single Outlet (Rp 50.000) + Kartu Pintar NFC',
        multi: 'Multi Cabang (Rp 100.000, Maks 3 Gerai) + Kartu Pintar NFC',
        franchise: 'Limit Franchise (Rp 500.000, Unlimited) + Kartu Pintar NFC'
    };

    document.getElementById('payBizName').textContent = biz.businessName;
    document.getElementById('payPackageLabel').textContent = packageDescriptions[biz.packageType] || biz.packageType;

    const waDisplay = document.getElementById('payOwnerWaDisplay');
    if (waDisplay) {
        waDisplay.textContent = '+' + (biz.whatsapp || '');
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closePaymentModal() {
    const modal = document.getElementById('modalPaymentMethods');
    if (modal) modal.classList.add('hidden');
}

// Alur setelah tap "Selesai & Menunggu Antrian"
let queuePollInterval = null;
let currentQueueBizId = null;

async function onFinishPaymentAndQueue() {
    closePaymentModal();
    await showThankYouQueueModal(newlyRegisteredBiz);
}

async function showThankYouQueueModal(biz) {
    if (!biz) {
        const list = window.KatayaDB ? await window.KatayaDB.getAllBusinesses() : [];
        if (list.length > 0) biz = list[list.length - 1];
    }
    if (!biz) return;

    currentQueueBizId = biz.id;
    const modal = document.getElementById('modalThankYouQueue');
    if (!modal) return;

    const bizNameEl = document.getElementById('thankYouBizName');
    if (bizNameEl) bizNameEl.textContent = biz.businessName;

    // Reset status tampilan modal ke mode antrean
    resetQueueModalState();

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();

    // Periksa apakah akun kebetulan sudah berstatus aktif
    const freshBiz = await window.KatayaDB.getBusinessById(biz.id);
    if (freshBiz && freshBiz.status === 'active') {
        handleAccountActivated(freshBiz);
        return;
    }

    // Polling realtime setiap 1,5 detik untuk mendeteksi aktivasi oleh developer
    if (queuePollInterval) clearInterval(queuePollInterval);
    queuePollInterval = setInterval(async () => {
        if (!currentQueueBizId) return;
        const checkBiz = await window.KatayaDB.getBusinessById(currentQueueBizId);
        if (checkBiz && checkBiz.status === 'active') {
            clearInterval(queuePollInterval);
            queuePollInterval = null;
            handleAccountActivated(checkBiz);
        }
    }, 1500);

    // Dengarkan event storage antar-tab
    window.removeEventListener('storage', handleStorageEventForQueue);
    window.addEventListener('storage', handleStorageEventForQueue);
}

async function handleStorageEventForQueue(e) {
    if (e.key === 'kataya_businesses' && currentQueueBizId) {
        const checkBiz = await window.KatayaDB.getBusinessById(currentQueueBizId);
        if (checkBiz && checkBiz.status === 'active') {
            if (queuePollInterval) {
                clearInterval(queuePollInterval);
                queuePollInterval = null;
            }
            handleAccountActivated(checkBiz);
        }
    }
}

function resetQueueModalState() {
    const statusCard = document.getElementById('thankYouStatusCard');
    const badgeText = document.getElementById('thankYouStatusBadgeText');
    const desc = document.getElementById('thankYouStatusDesc');
    const iconWrap = document.getElementById('thankYouIconWrap');
    const btn = document.getElementById('btnEnterReviewNow');
    const btnText = document.getElementById('btnEnterReviewText');

    if (statusCard) {
        statusCard.className = 'p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 mb-5 text-center space-y-1.5 transition-all';
    }
    if (iconWrap) {
        iconWrap.className = 'w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-inner transition-all';
        iconWrap.innerHTML = '<i data-lucide="heart-handshake" class="w-9 h-9"></i>';
    }
    if (badgeText) {
        badgeText.textContent = 'Status: Menunggu Antrean Aktivasi';
    }
    if (desc) {
        desc.innerHTML = 'Data bisnis Anda sedang dalam antrean aktivasi developer. Begitu disetujui, layar ini akan <strong>langsung mengarahkan Anda masuk ke Halaman Ulasan</strong>.';
    }
    if (btn) {
        btn.className = 'w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all';
    }
    if (btnText) {
        btnText.textContent = 'Cek Status & Masuk Halaman Ulasan';
    }
    if (window.lucide) lucide.createIcons();
}

// Handler saat akun telah diaktifkan oleh developer -> Langsung masuk ulasan
function handleAccountActivated(biz) {
    const statusCard = document.getElementById('thankYouStatusCard');
    const badgeText = document.getElementById('thankYouStatusBadgeText');
    const desc = document.getElementById('thankYouStatusDesc');
    const iconWrap = document.getElementById('thankYouIconWrap');
    const btn = document.getElementById('btnEnterReviewNow');
    const btnText = document.getElementById('btnEnterReviewText');

    if (statusCard) {
        statusCard.className = 'p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 mb-5 text-center space-y-1.5 transition-all shadow-sm';
    }
    if (iconWrap) {
        iconWrap.className = 'w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner transition-all scale-105';
        iconWrap.innerHTML = '<i data-lucide="check-check" class="w-9 h-9"></i>';
    }
    if (badgeText) {
        badgeText.innerHTML = '🎉 Status: AKUN AKTIF RESMI!';
    }
    if (desc) {
        desc.innerHTML = 'Selamat! Akun Anda telah disetujui developer. <strong>Mengarahkan Anda langsung masuk ke Halaman Ulasan bisnis...</strong>';
    }
    if (btn) {
        btn.className = 'w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all animate-pulse';
    }
    if (btnText) {
        btnText.textContent = 'Langsung Masuk Halaman Ulasan →';
    }
    if (window.lucide) lucide.createIcons();

    // Efek confetti selebrasi
    if (typeof confetti === 'function') {
        try {
            confetti({
                particleCount: 90,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch(e) {}
    }

    // Otomatis langsung masuk ulasan setelah delay singkat
    setTimeout(() => {
        window.location.href = `review.html?id=${biz.id}`;
    }, 1500);
}

async function checkAndRedirectToReview() {
    if (!currentQueueBizId && newlyRegisteredBiz) {
        currentQueueBizId = newlyRegisteredBiz.id;
    }
    if (!currentQueueBizId) {
        const all = window.KatayaDB ? await window.KatayaDB.getAllBusinesses() : [];
        if (all.length > 0) currentQueueBizId = all[all.length - 1].id;
    }
    if (!currentQueueBizId) return;

    const biz = await window.KatayaDB.getBusinessById(currentQueueBizId);
    if (!biz) return;

    if (biz.status === 'active') {
        window.location.href = `review.html?id=${biz.id}`;
    } else {
        alert(`Ulasan Belum Dapat Diakses!\n\nBisnis "${biz.businessName}" saat ini masih dalam antrean dan belum diaktifkan oleh developer Kataya.\n\nSistem akan otomatis membuka halaman ulasan segera setelah disetujui oleh pengembang.`);
    }
}

function closeThankYouModal() {
    if (queuePollInterval) {
        clearInterval(queuePollInterval);
        queuePollInterval = null;
    }
    window.removeEventListener('storage', handleStorageEventForQueue);
    const modal = document.getElementById('modalThankYouQueue');
    if (modal) modal.classList.add('hidden');
}

// Kirim Permohonan & Tautan Aktivasi Unik ke WhatsApp Developer Kataya
async function sendActivationToDevWa() {
    if (!newlyRegisteredBiz) return;

    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    // 5. Tautan aktivasi unik 1 kali pakai
    const activationUrl = `${origin}${path}/developer.html?activate=${newlyRegisteredBiz.id}&token=${newlyRegisteredBiz.activationToken}`;

    const packageNames = {
        single: 'Single Outlet (Rp 50.000) + Kartu NFC',
        multi: 'Multi Cabang (Rp 100.000) + Kartu NFC',
        franchise: 'Limit Franchise (Rp 500.000) + Kartu NFC'
    };

    const textMessage = 
        `Halo Developer Kataya, saya telah melakukan pendaftaran sistem ulasan cerdas untuk bisnis:\n\n` +
        `• *Nama Bisnis*: ${newlyRegisteredBiz.businessName}\n` +
        `• *Paket Dipilih*: ${packageNames[newlyRegisteredBiz.packageType] || newlyRegisteredBiz.packageType}\n` +
        `• *WhatsApp Owner*: +${newlyRegisteredBiz.whatsapp}\n\n` +
        `Mohon konfirmasi pembayaran resmi dan setujui aktivasi fitur kami melalui tautan aktivasi berikut:\n${activationUrl}`;

    const devPhone = (window.KatayaDB && typeof window.KatayaDB.getDeveloperPhone === 'function')
        ? await window.KatayaDB.getDeveloperPhone()
        : '6285856640045';
    const waDevUrl = `https://wa.me/${devPhone}?text=${encodeURIComponent(textMessage)}`;

    closePaymentModal();
    window.open(waDevUrl, '_blank');
}

// Modal Bantuan Place ID
function showPlaceIdHelper() {
    const modal = document.getElementById('modalPlaceIdHelper');
    if (modal) modal.classList.remove('hidden');
}
function closePlaceIdHelper() {
    const modal = document.getElementById('modalPlaceIdHelper');
    if (modal) modal.classList.add('hidden');
}

// Tampilkan di Beranda Bisnis yang Sudah Terdaftar (Secara Real-time)
async function renderRegisteredBusinesses() {
    const list = await window.KatayaDB.getAllBusinesses();
    const grid = document.getElementById('registeredBusinessGrid');
    const realtimeCountText = document.getElementById('realtimeCountText');
    const heroLiveCountBadge = document.getElementById('heroLiveCountBadge');

    // 1. Perbarui jumlah pendaftar real-time pada badge counter
    if (realtimeCountText) {
        realtimeCountText.textContent = list.length;
    }
    if (heroLiveCountBadge) {
        heroLiveCountBadge.textContent = `${list.length} Bisnis Terproteksi`;
    }

    // 2. Bandingkan signature data agar tidak merender ulang kartu jika tidak ada perubahan
    const currentHash = JSON.stringify(list.map(b => ({
        id: b.id,
        name: b.businessName,
        revCount: (b.reviews || []).length,
        status: b.status,
        branches: (b.branches || []).length,
        logo: (b.settings && b.settings.logoUrl) || ''
    })));

    if (currentHash === lastRenderedBusinessesHash) {
        return; // Data tidak berubah, hindari render ulang yang tidak perlu
    }
    lastRenderedBusinessesHash = currentHash;

    if (!grid) return;
    grid.innerHTML = '';

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                Belum ada bisnis yang terdaftar. Jadilah yang pertama mendaftarkan bisnis Anda di formulir atas!
            </div>
        `;
        return;
    }

    list.forEach(biz => {
        const reviews = biz.reviews || [];
        const branchesCount = (biz.branches && biz.branches.length) || 1;
        const isPending = biz.status === 'pending';

        // Hitung estimasi skor rating rata-rata
        let avgRating = '5.0';
        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => acc + r.stars, 0);
            avgRating = (sum / reviews.length).toFixed(1);
        }

        const packageNames = {
            single: 'Single Outlet',
            multi: 'Multi Cabang',
            franchise: 'Franchise'
        };
        const packageName = packageNames[biz.packageType] || 'Bisnis Mitra';

        const initial = biz.businessName ? biz.businessName.charAt(0).toUpperCase() : 'K';
        const primaryColor = (biz.settings && biz.settings.primaryColor) || '#BE123C';
        const logoUrl = biz.settings && biz.settings.logoUrl;

        const card = document.createElement('a');
        card.href = `review.html?id=${biz.id}`;
        card.className = 'block bg-white rounded-3xl p-6 border border-slate-200 shadow-md hover:shadow-2xl hover:border-[#E01A8A] hover:-translate-y-1 transition-all flex flex-col justify-between group cursor-pointer text-left text-[#0A1931]';
        card.title = `Ketuk untuk beri review pada ${escapeHtml(biz.businessName)}`;

        const logoElement = logoUrl 
            ? `<img src="${logoUrl}" alt="${escapeHtml(biz.businessName)}" class="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0">`
            : `<div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0" style="background-color: ${primaryColor}">${initial}</div>`;

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex items-center gap-3">
                        ${logoElement}
                        <div>
                            <h3 class="font-black text-[#0A1931] text-base group-hover:text-[#BE123C] transition-colors line-clamp-1">
                                ${escapeHtml(biz.businessName)}
                            </h3>
                            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span class="font-semibold text-[#BE123C]">${packageName}</span>
                                <span>&bull;</span>
                                <span>${escapeHtml(biz.businessType || 'Kuliner (F&B)')}</span>
                                <span>&bull;</span>
                                <span>${branchesCount} Cabang</span>
                            </div>
                        </div>
                    </div>
                    <span class="px-2 py-1 rounded-lg bg-pink-50 text-[#BE123C] text-[10px] font-bold shrink-0 flex items-center gap-1 group-hover:bg-[#BE123C] group-hover:text-white transition-colors">
                        <i data-lucide="star" class="w-3 h-3 fill-amber-400 text-amber-400"></i> Review
                    </span>
                </div>

                <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs mb-3">
                    <div class="flex items-center gap-1.5">
                        <div class="flex text-amber-400">
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                        </div>
                        <span class="font-black text-slate-800">${avgRating} ★</span>
                        <span class="text-slate-400 text-[10px]">(${reviews.length} ulasan)</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-black ${isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                        ${isPending ? 'Menunggu Aktivasi' : '✔ Terproteksi Kataya'}
                    </span>
                </div>

                <div class="flex items-center gap-1.5 text-[11px] text-indigo-700 font-semibold mb-4 bg-indigo-50/70 px-2.5 py-1 rounded-lg">
                    <i data-lucide="wifi" class="w-3.5 h-3.5 rotate-90 shrink-0"></i>
                    <span>Mendukung Kartu Pintar NFC &amp; Barcode</span>
                </div>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold ${isPending ? 'text-amber-700' : 'text-blue-600 group-hover:text-blue-700'}">
                <span class="flex items-center gap-1.5">
                    <i data-lucide="${isPending ? 'lock' : 'message-square-plus'}" class="w-4 h-4 ${isPending ? 'text-amber-600' : 'text-blue-600'}"></i>
                    <span>${isPending ? 'Akses Ulasan Terkunci' : 'Beri Ulasan Sekarang'}</span>
                </span>
                <span class="inline-flex items-center gap-1 text-[11px] ${isPending ? 'text-amber-600' : 'group-hover:translate-x-1'} transition-transform">
                    <span>${isPending ? 'Belum Aktif' : 'Buka Review'}</span>
                    <i data-lucide="${isPending ? 'shield-alert' : 'arrow-right'}" class="w-3.5 h-3.5"></i>
                </span>
            </div>
        `;
        grid.appendChild(card);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper salin nomor rekening/e-wallet ke clipboard
function copyPaymentNumber(num, label) {
    if (!num) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(num).then(() => {
            alert(`Nomor pembayaran ${label} (${num}) berhasil disalin ke clipboard!`);
        }).catch(() => {
            prompt(`Salin nomor pembayaran ${label}:`, num);
        });
    } else {
        prompt(`Salin nomor pembayaran ${label}:`, num);
    }
}



// --- HOME PAGE LOGIN FORM & WAIT STATE ---
function setupHomeLoginForm() {
    const formLoginHome = document.getElementById('formLoginHome');
    if (!formLoginHome) return;

    formLoginHome.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneInput = document.getElementById('authInputPhone');
        const pinInput = document.getElementById('authInputPin');
        const err = document.getElementById('authPinErrorHome');
        
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const pin = pinInput ? pinInput.value.trim() : '';
        const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0/, '62');
        if (!cleanPhone || !pin) return;

        // Proteksi brute force 3x percobaan
        const lockoutKey = 'auth_home_' + cleanPhone;
        const lockStatus = window.KatayaDB && window.KatayaDB.LOGIN_SECURITY
            ? window.KatayaDB.LOGIN_SECURITY.checkLockout(lockoutKey)
            : { locked: false, waitSeconds: 0 };

        const devPhone = (window.KatayaDB && typeof window.KatayaDB.getDeveloperPhone === 'function')
            ? await window.KatayaDB.getDeveloperPhone()
            : '6285856640045';

        if (!window.KatayaDB || typeof window.KatayaDB.authenticateBusiness !== 'function') {
            if (err) {
                err.classList.remove('hidden');
                err.textContent = 'Modul autentikasi belum siap. Silakan muat ulang halaman.';
            }
            return;
        }

        const biz = await window.KatayaDB.authenticateBusiness(cleanPhone, pin);
        if (biz) {
            if (window.KatayaDB.LOGIN_SECURITY) {
                window.KatayaDB.LOGIN_SECURITY.clearAttempts(lockoutKey);
            }
            if (err) err.classList.add('hidden');
            
            if (biz.status === 'pending') {
                await showThankYouQueueModal(biz);
            } else if (biz.status === 'active') {
                sessionStorage.setItem('kataya_auth_biz_id', biz.id);
                window.location.href = 'dashboard.html?id=' + encodeURIComponent(biz.id);
            }
        } else {
            // Mitra Salah PIN: Langsung Masuk WhatsApp & Minta PIN Baru ke Developer
            // PENTING: TIDAK MENAMPILKAN PIN BARU DI SINI (Menunggu Developer Mengirimkannya)
            const allBiz = await window.KatayaDB.getAllBusinesses();
            const matchedBiz = allBiz.find(b => {
                const bPhone = String(b.whatsapp || '').replace(/\D/g, '').replace(/^0/, '62');
                return bPhone === cleanPhone;
            });

            if (!matchedBiz) {
                if (err) {
                    err.classList.remove('hidden');
                    err.innerHTML = `
                        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-bold text-center">
                            Nomor WhatsApp (+${cleanPhone}) belum terdaftar dalam sistem. Silakan <button type="button" onclick="toggleForm()" class="underline text-[#BE123C]">daftar akun baru di sini</button>.
                        </div>
                    `;
                }
                return;
            }

            // Buat permintaan PIN baru resmi ke WhatsApp Developer
            const reqRes = await window.KatayaDB.createPinRequest(cleanPhone);
            const targetWaUrl = reqRes.waRequestUrl;

            const notifHtml = `
                <div class="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-left space-y-2.5 mt-2 shadow-md">
                    <div class="font-black text-amber-900 text-xs flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="bell-ring" class="w-4 h-4 text-amber-600 animate-bounce"></i>
                            <span>Notifikasi: Permintaan PIN Baru Aktif</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">Salah PIN</span>
                    </div>
                    <p class="text-[11px] text-amber-900 leading-relaxed">
                        PIN yang Anda masukkan salah. Sistem secara otomatis mengarahkan Anda ke <strong>WhatsApp Developer (+${devPhone})</strong> untuk meminta kode PIN baru akun <strong>${escapeHtml(matchedBiz.businessName)}</strong>.
                    </p>
                    <div class="p-2.5 bg-white border border-amber-200 rounded-xl flex items-center gap-2">
                        <i data-lucide="clock" class="w-4 h-4 text-amber-600 shrink-0"></i>
                        <span class="text-xs font-bold text-slate-700">Status: Menunggu Developer Mengirimkan PIN Baru</span>
                    </div>
                    <a href="${targetWaUrl}" target="_blank" class="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow flex items-center justify-center gap-1.5 transition-all">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                        <span>Kirim Pesan Minta PIN ke WhatsApp Developer</span>
                    </a>
                    <p class="text-[10px] text-slate-500 italic text-center">Setelah pesan terkirim, Developer akan segera mengirimkan kode PIN baru resmi ke WhatsApp Anda.</p>
                </div>
            `;

            if (err) {
                err.classList.remove('hidden');
                err.innerHTML = notifHtml;
                if (window.lucide) lucide.createIcons();
            }

            // Buka WhatsApp langsung ke Developer
            setTimeout(() => {
                window.open(targetWaUrl, '_blank');
            }, 300);

            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    });
}

// Periksa parameter ?wait= pada URL untuk langsung membuka modal antrean
async function checkWaitParamFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const waitBizId = urlParams.get('wait');
    if (waitBizId && window.KatayaDB && typeof window.KatayaDB.getBusinessById === 'function') {
        const biz = await window.KatayaDB.getBusinessById(waitBizId);
        if (biz) {
            setTimeout(async () => {
                await showThankYouQueueModal(biz);
            }, 300);
        }
    }
}

