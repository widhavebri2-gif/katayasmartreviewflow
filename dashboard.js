/**
 * Kataya Smart Review Flow - Client Logic for Owner Dashboard (dashboard.js)
 * Menangani grafik statistik, generator barcode & kartu pintar NFC, manajemen cabang (dengan kuota lisensi), dan upgrade paket.
 */

let currentBiz = null;
let qrCodeInstance = null;
let trendChartInstance = null;
let doughnutChartInstance = null;

function getFullUrl(relPath) {
    if (window.location.protocol === 'file:') {
        const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        return `${basePath}/${relPath}`;
    }
    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    return `${origin}${path}/${relPath}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    await initDashboardAuth();
    initForgotPinForm();
    initChangePinForm();

    // Pembaruan real-time jika ada review baru masuk
    window.addEventListener('storage', async () => {
        if (currentBiz) {
            await loadDashboard(currentBiz.id);
        }
    });

    // Responsif terhadap perubahan bahasa (i18n)
    window.addEventListener('kataya:lang_changed', () => {
        if (currentBiz) {
            renderStatistics();
            renderCharts();
            renderRecentActivities();
        }
    });
});

// 1. Inisialisasi Autentikasi Dashboard (Login dengan Nomor WhatsApp Terdaftar & PIN)
async function initDashboardAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const bizId = urlParams.get('id');
    const allBusinesses = await window.KatayaDB.getAllBusinesses();

    const authOverlay = document.getElementById('dashboardAuthOverlay');
    const inputPhone = document.getElementById('authInputPhone');
    const inputPin = document.getElementById('authInputPin');
    const errEl = document.getElementById('authPinError');

    // Jika ada parameter bizId di URL, kita isi otomatis nomor teleponnya jika ada
    if (bizId) {
        const targetBiz = await window.KatayaDB.getBusinessById(bizId);
        if (targetBiz && inputPhone) {
            inputPhone.value = targetBiz.whatsapp || '';
        }
    }

    // Cek apakah sudah ada sesi valid di session storage
    const loggedBizId = sessionStorage.getItem('kataya_auth_biz_id');
    const isDevAuth = sessionStorage.getItem('kataya_dev_authenticated') === 'true';

    if (bizId && (isDevAuth || loggedBizId === bizId)) {
        sessionStorage.setItem('kataya_auth_biz_id', bizId);
        await loadDashboard(bizId);
        return;
    }

    if (loggedBizId && (await window.KatayaDB.getBusinessById(loggedBizId))) {
        if (bizId && bizId !== loggedBizId) {
            showAuthOverlay();
        } else {
            await loadDashboard(loggedBizId);
        }
    } else if (allBusinesses.length > 0) {
        showAuthOverlay();
    } else {
        alert('Belum ada data bisnis yang terdaftar. Mengalihkan ke halaman pendaftaran...');
        window.location.href = 'index.html';
    }

    // Form login handler (Verifikasi Nomor Terdaftar & PIN)
    const formLogin = document.getElementById('formDashboardLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawPhone = inputPhone ? inputPhone.value.trim() : '';
            const enteredPin = inputPin ? inputPin.value.trim() : '';

            if (errEl) errEl.classList.add('hidden');

            // Normalisasi nomor telepon
            const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');

            if (!cleanPhone) {
                if (errEl) {
                    errEl.textContent = 'Silakan masukkan nomor WhatsApp yang Anda daftarkan.';
                    errEl.classList.remove('hidden');
                }
                return;
            }

            if (!enteredPin) {
                if (errEl) {
                    errEl.textContent = 'Silakan masukkan PIN akses bisnis Anda.';
                    errEl.classList.remove('hidden');
                }
                return;
            }

            // Cek proteksi anti brute-force
            const lockoutKey = 'dash_' + cleanPhone;
            const lockStatus = window.KatayaDB && window.KatayaDB.LOGIN_SECURITY
                ? window.KatayaDB.LOGIN_SECURITY.checkLockout(lockoutKey)
                : { locked: false, waitSeconds: 0 };

            const devPhone = (window.KatayaDB && typeof window.KatayaDB.getDeveloperPhone === 'function')
                ? await window.KatayaDB.getDeveloperPhone()
                : '6285856640045';

            const currentList = await window.KatayaDB.getAllBusinesses();

            // Cari bisnis berdasarkan nomor WhatsApp
            const matchedBiz = currentList.find(b => {
                const bPhone = (b.whatsapp || '').replace(/\D/g, '').replace(/^0/, '62');
                return bPhone === cleanPhone;
            });

            // Cek apakah PIN Master Developer
            const isMasterDev = (window.KatayaDB && typeof window.KatayaDB.verifyDeveloperPin === 'function')
                ? window.KatayaDB.verifyDeveloperPin(enteredPin)
                : (enteredPin === '2202');

            if (!matchedBiz) {
                // Jika developer memasukkan PIN master dan ingin membuka bisnis tertentu
                if (isMasterDev && currentList.length > 0) {
                    window.KatayaDB.LOGIN_SECURITY.clearAttempts(lockoutKey);
                    const targetBiz = bizId ? (await window.KatayaDB.getBusinessById(bizId)) || currentList[0] : currentList[0];
                    sessionStorage.setItem('kataya_auth_biz_id', targetBiz.id);
                    authOverlay.classList.add('hidden');
                    await loadDashboard(targetBiz.id);
                    return;
                }

                if (errEl) {
                    errEl.textContent = 'Nomor WhatsApp belum terdaftar dalam sistem. Periksa kembali nomor Anda.';
                    errEl.classList.remove('hidden');
                }
                return;
            }

            // Verifikasi PIN bisnis atau Developer Master PIN
            if (enteredPin === matchedBiz.pin || isMasterDev) {
                window.KatayaDB.LOGIN_SECURITY.clearAttempts(lockoutKey);
                sessionStorage.setItem('kataya_auth_biz_id', matchedBiz.id);
                authOverlay.classList.add('hidden');
                await loadDashboard(matchedBiz.id);
            } else {
                // Mitra Salah PIN: Langsung Arahkan ke WhatsApp Developer untuk Minta PIN Baru
                // PENTING: TIDAK MENAMPILKAN PIN BARU DI WHATSAPP MITRA SEBELUM DEVELOPER MENGIRIMNYA!
                const reqRes = await window.KatayaDB.createPinRequest(cleanPhone);
                const targetWaUrl = reqRes.waRequestUrl;

                if (errEl) {
                    errEl.innerHTML = `
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
                    errEl.classList.remove('hidden');
                    if (window.lucide) lucide.createIcons();
                }

                // Buka WhatsApp langsung ke Developer
                setTimeout(() => {
                    window.open(targetWaUrl, '_blank');
                }, 300);

                if (inputPin) {
                    inputPin.value = '';
                    inputPin.focus();
                }
            }
        });
    }
}

function showAuthOverlay() {
    const authOverlay = document.getElementById('dashboardAuthOverlay');
    const inputPin = document.getElementById('authInputPin');
    const inputPhone = document.getElementById('authInputPhone');
    const errEl = document.getElementById('authPinError');

    if (errEl) errEl.classList.add('hidden');
    if (inputPin) inputPin.value = '';
    if (authOverlay) authOverlay.classList.remove('hidden');

    if (inputPhone && !inputPhone.value) {
        setTimeout(() => inputPhone.focus(), 150);
    } else if (inputPin) {
        setTimeout(() => inputPin.focus(), 150);
    }
}

// Keluar dari Dashboard Langsung Masuk ke Ulasan Bisnis
async function logoutToReview(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = (currentBiz && currentBiz.id) ? currentBiz.id : (urlParams.get('id') || '');
    
    // Hapus sesi autentikasi dashboard
    sessionStorage.removeItem('kataya_auth_biz_id');

    // Langsung arahkan ke ulasan bisnis yang bersangkutan
    if (targetId) {
        window.location.href = `review.html?id=${encodeURIComponent(targetId)}`;
    } else {
        const all = window.KatayaDB ? await window.KatayaDB.getAllBusinesses() : [];
        if (all.length > 0) {
            window.location.href = `review.html?id=${encodeURIComponent(all[0].id)}`;
        } else {
            window.location.href = 'index.html';
        }
    }
}

function switchBusinessSession() {
    logoutToReview();
}

// Modal Lupa PIN
function openForgotPinModal() {
    const modal = document.getElementById('modalForgotPin');
    const authInputPhone = document.getElementById('authInputPhone');
    const forgotPhone = document.getElementById('forgotInputPhone');
    const forgotNewPin = document.getElementById('forgotInputNewPin');
    const forgotConfirmPin = document.getElementById('forgotInputConfirmPin');
    const errEl = document.getElementById('forgotPinError');
    const succEl = document.getElementById('forgotPinSuccess');

    if (errEl) errEl.classList.add('hidden');
    if (succEl) succEl.classList.add('hidden');
    if (forgotNewPin) forgotNewPin.value = '';
    if (forgotConfirmPin) forgotConfirmPin.value = '';

    if (forgotPhone && authInputPhone && authInputPhone.value) {
        forgotPhone.value = authInputPhone.value;
    }

    if (modal) {
        modal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
}

function closeForgotPinModal() {
    const modal = document.getElementById('modalForgotPin');
    if (modal) modal.classList.add('hidden');
}
window.openForgotPinModal = openForgotPinModal;
window.closeForgotPinModal = closeForgotPinModal;

// Form Handler Lupa PIN / Reset PIN
function initForgotPinForm() {
    const form = document.getElementById('formForgotPin');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phoneInput = document.getElementById('forgotInputPhone');
        const newPinInput = document.getElementById('forgotInputNewPin');
        const confirmPinInput = document.getElementById('forgotInputConfirmPin');
        const errEl = document.getElementById('forgotPinError');
        const succEl = document.getElementById('forgotPinSuccess');

        if (errEl) errEl.classList.add('hidden');
        if (succEl) succEl.classList.add('hidden');

        const rawPhone = phoneInput ? phoneInput.value.trim() : '';
        const newPin = newPinInput ? newPinInput.value.trim() : '';
        const confirmPin = confirmPinInput ? confirmPinInput.value.trim() : '';

        if (!rawPhone) {
            if (errEl) {
                errEl.textContent = 'Silakan masukkan nomor WhatsApp yang Anda daftarkan.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        if (!newPin || newPin.length < 4) {
            if (errEl) {
                errEl.textContent = 'PIN baru minimal harus 4 karakter atau angka.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        if (newPin !== confirmPin) {
            if (errEl) {
                errEl.textContent = 'Konfirmasi PIN baru tidak sesuai dengan PIN baru.';
                errEl.classList.remove('hidden');
            }
            return;
        }

        const updatedBiz = await window.KatayaDB.resetBusinessPinByWhatsapp(rawPhone, newPin);
        if (updatedBiz) {
            if (succEl) {
                const bName = updatedBiz.businessName || updatedBiz.name || 'Bisnis';
                succEl.textContent = `PIN untuk bisnis "${bName}" berhasil direset! Mengalihkan ke dashboard...`;
                succEl.classList.remove('hidden');
            }
            sessionStorage.setItem('kataya_auth_biz_id', updatedBiz.id);

            setTimeout(async () => {
                closeForgotPinModal();
                const authOverlay = document.getElementById('dashboardAuthOverlay');
                if (authOverlay) authOverlay.classList.add('hidden');
                await loadDashboard(updatedBiz.id);
            }, 1200);
        } else {
            if (errEl) {
                errEl.textContent = 'Nomor WhatsApp belum terdaftar di sistem. Pastikan nomor yang dimasukkan sama persis dengan saat pendaftaran.';
                errEl.classList.remove('hidden');
            }
        }
    });
}

// Form Handler Ganti PIN di Tab Dashboard
function initChangePinForm() {
    const form = document.getElementById('formChangePin');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPinInput = document.getElementById('inputCurrentPin');
        const newPinInput = document.getElementById('inputNewPin');
        const confirmPinInput = document.getElementById('inputConfirmNewPin');
        const alertEl = document.getElementById('changePinAlert');

        if (!alertEl) return;
        alertEl.className = 'p-3.5 rounded-xl text-xs font-bold hidden';

        if (!currentBiz) {
            alertEl.textContent = 'Data bisnis tidak aktif. Silakan muat ulang halaman.';
            alertEl.className = 'p-3.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 block';
            return;
        }

        const currentPin = currentPinInput ? currentPinInput.value.trim() : '';
        const newPin = newPinInput ? newPinInput.value.trim() : '';
        const confirmPin = confirmPinInput ? confirmPinInput.value.trim() : '';

        if (!currentPin) {
            alertEl.textContent = 'Silakan masukkan PIN saat ini / PIN lama Anda.';
            alertEl.className = 'p-3.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 block';
            if (currentPinInput) currentPinInput.focus();
            return;
        }

        if (!newPin || newPin.length < 4) {
            alertEl.textContent = 'PIN baru minimal harus 4 digit karakter atau angka.';
            alertEl.className = 'p-3.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 block';
            if (newPinInput) newPinInput.focus();
            return;
        }

        if (newPin !== confirmPin) {
            alertEl.textContent = 'Konfirmasi PIN baru tidak sesuai dengan PIN baru.';
            alertEl.className = 'p-3.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 block';
            if (confirmPinInput) confirmPinInput.focus();
            return;
        }

        const res = await window.KatayaDB.changeBusinessPin(currentBiz.id, currentPin, newPin);
        if (res && res.success) {
            currentBiz = res.business;
            alertEl.textContent = 'Berhasil! PIN akses dashboard Anda telah diperbarui menjadi yang baru.';
            alertEl.className = 'p-3.5 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 block';
            form.reset();
        } else {
            alertEl.textContent = (res && res.message) ? res.message : 'Gagal memperbarui PIN. Periksa kembali PIN lama Anda.';
            alertEl.className = 'p-3.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-600 block';
        }
    });
}

// 2. Muat Data Dashboard Bisnis (Dengan Proteksi Autentikasi Sesi)
async function loadDashboard(bizId) {
    const loggedBizId = sessionStorage.getItem('kataya_auth_biz_id');
    const isDevAuth = sessionStorage.getItem('kataya_dev_authenticated') === 'true';

    // Proteksi: Cegah akses ilegal jika sesi belum diautentikasi
    if (!isDevAuth && (!loggedBizId || loggedBizId !== bizId)) {
        console.warn('Akses tidak sah ke dashboard dicegah. Membuka overlay autentikasi.');
        showAuthOverlay();
        return;
    }

    if (window.KatayaDB && typeof window.KatayaDB.touchBusinessActivity === 'function') {
        await window.KatayaDB.touchBusinessActivity(bizId);
    }
    currentBiz = await window.KatayaDB.getBusinessById(bizId);
    if (!currentBiz) {
        alert('Bisnis tidak ditemukan.');
        return;
    }

    // Header info
    document.title = `Dashboard - ${currentBiz.businessName}`;
    document.getElementById('dashBizName').textContent = currentBiz.businessName;
    document.getElementById('dashPlaceId').textContent = currentBiz.placeId;
    
    // Label Paket & Kuota Cabang
    const packageLabels = {
        single: 'Single Outlet (Rp 50rb) + NFC',
        multi: 'Multi Cabang (Maks 3 Cabang) + NFC',
        franchise: 'Limit Franchise (Unlimited) + NFC'
    };
    const currentPkg = currentBiz.packageType || 'single';
    document.getElementById('dashPackageBadge').textContent = packageLabels[currentPkg] || currentPkg;
    document.getElementById('currentPackageDisplay').textContent = packageLabels[currentPkg] || currentPkg;

    const branchCount = (currentBiz.branches && currentBiz.branches.length) || 1;
    document.getElementById('dashBranchBadge').textContent = `${branchCount} Cabang Aktif`;

    // Update link review langsung
    const reviewUrl = getFullUrl(`review.html?id=${currentBiz.id}`);
    const btnViewReview = document.getElementById('btnViewLiveReview');
    if (btnViewReview) btnViewReview.href = reviewUrl;

    // CS WhatsApp Link (Dinamis dari Bot Developer)
    const devPhone = (window.KatayaDB && typeof window.KatayaDB.getDeveloperPhone === 'function')
        ? await window.KatayaDB.getDeveloperPhone()
        : '6285856640045';
    const csLink = `https://wa.me/${devPhone}?text=${encodeURIComponent('Halo Tim Kataya, saya butuh bantuan untuk bisnis: ' + currentBiz.businessName)}`;
    const btnCs = document.getElementById('btnContactCs');
    const footerCs = document.getElementById('footerCsLink');
    if (btnCs) btnCs.href = csLink;
    if (footerCs) footerCs.href = csLink;

    // Render komponen dashboard secara aman & terisolasi
    try { renderStatistics(); } catch (e) { console.error('Error renderStatistics:', e); }
    try { renderCharts(); } catch (e) { console.error('Error renderCharts:', e); }
    try { renderRecentActivities(); } catch (e) { console.error('Error renderRecentActivities:', e); }
    try { await initQrCodeSection(); } catch (e) { console.error('Error initQrCodeSection:', e); }
    try { renderBranchesSection(); } catch (e) { console.error('Error renderBranchesSection:', e); }
    try { loadAppearanceSettings(); } catch (e) { console.error('Error loadAppearanceSettings:', e); }
}

// 3. Render Kartu Statistik (Requirements 5, 6, 7)
function renderStatistics() {
    if (!currentBiz) return;
    const reviews = currentBiz.reviews || [];

    const totalFeedback = reviews.length;
    const googleReviews = reviews.filter(r => r.type === 'google').length;
    const waComplaints = reviews.filter(r => r.type === 'whatsapp').length;

    let avgRating = 0;
    if (totalFeedback > 0) {
        const sum = reviews.reduce((acc, r) => acc + r.stars, 0);
        avgRating = (sum / totalFeedback).toFixed(1);
    }

    document.getElementById('statTotalFeedback').textContent = totalFeedback;
    document.getElementById('statGoogleReviews').textContent = googleReviews;
    document.getElementById('statWaComplaints').textContent = waComplaints;
    document.getElementById('statAvgRating').textContent = `${avgRating} ★`;

    const percentGoogle = totalFeedback > 0 ? Math.round((googleReviews / totalFeedback) * 100) : 0;
    const percentWa = totalFeedback > 0 ? Math.round((waComplaints / totalFeedback) * 100) : 0;

    const isEn = window.KatayaI18n && window.KatayaI18n.getCurrentLang() === 'en';
    const labelGoogle = document.getElementById('labelPercentGoogle');
    const labelWa = document.getElementById('labelPercentWa');
    if (labelGoogle) labelGoogle.textContent = isEn ? `${percentGoogle}% (${googleReviews} Reviews)` : `${percentGoogle}% (${googleReviews} Ulasan)`;
    if (labelWa) labelWa.textContent = isEn ? `${percentWa}% (${waComplaints} Intercepted)` : `${percentWa}% (${waComplaints} Dicegat)`;

    const protectStatement = document.getElementById('dashProtectionStatement');
    if (protectStatement) {
        protectStatement.textContent = isEn
            ? `Great! The Kataya system has safeguarded your reputation from ${waComplaints} negative complaints privately via WhatsApp, keeping your Google Maps rating stellar!`
            : `Hebat! Sistem Kataya telah menyelamatkan reputasi Anda dari ${waComplaints} keluhan negatif secara pribadi lewat WhatsApp, menjaga Google Maps Anda tetap prima!`;
    }
}

// 4. Render Grafik Aktivitas (Chart.js)
function renderCharts() {
    if (!currentBiz) return;
    if (typeof Chart === 'undefined') {
        console.warn('Library Chart.js belum tersedia (offline/loading), melewati render grafik.');
        return;
    }
    const reviews = currentBiz.reviews || [];

    // Siapkan data 7 hari terakhir
    const days = [];
    const googleCounts = [];
    const waCounts = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        days.push(dayStr);

        const dDate = d.toISOString().slice(0, 10);
        const dayReviews = reviews.filter(r => (r.date || '').slice(0, 10) === dDate);

        googleCounts.push(dayReviews.filter(r => r.type === 'google').length);
        waCounts.push(dayReviews.filter(r => r.type === 'whatsapp').length);
    }

    // Chart Tren Garis / Batang
    const ctxTrend = document.getElementById('chartTrendReviews');
    if (ctxTrend) {
        if (trendChartInstance) trendChartInstance.destroy();
        const isEn = window.KatayaI18n && window.KatayaI18n.getCurrentLang() === 'en';
        trendChartInstance = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [
                    {
                        label: isEn ? 'Google Reviews (4-5★)' : 'Google Review (4-5★)',
                        data: googleCounts,
                        backgroundColor: '#BE123C',
                        borderRadius: 6
                    },
                    {
                        label: isEn ? 'Intercepted to WA (1-3★)' : 'Tersaring ke WA (1-3★)',
                        data: waCounts,
                        backgroundColor: '#f59e0b',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Chart Doughnut Efektivitas
    const ctxDoughnut = document.getElementById('chartDoughnutReviews');
    if (ctxDoughnut) {
        if (doughnutChartInstance) doughnutChartInstance.destroy();

        const totalGoogle = reviews.filter(r => r.type === 'google').length;
        const totalWa = reviews.filter(r => r.type === 'whatsapp').length;
        const dataVals = (totalGoogle === 0 && totalWa === 0) ? [1] : [totalGoogle, totalWa];
        const bgColors = (totalGoogle === 0 && totalWa === 0) ? ['#e2e8f0'] : ['#BE123C', '#f59e0b'];

        doughnutChartInstance = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: isEn ? ['Google Review', 'Filtered to WhatsApp'] : ['Google Review', 'Tersaring WA'],
                datasets: [{
                    data: dataVals,
                    backgroundColor: bgColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { display: false } }
            }
        });
    }
}

// 5. Render Aktivitas Ulasan Terbaru (Khusus 1 Bulan Terakhir / 30 Hari)
function renderRecentActivities() {
    if (!currentBiz) return;
    const tbody = document.getElementById('tableReviewActivityBody');
    if (!tbody) return;

    const isEn = window.KatayaI18n && window.KatayaI18n.getCurrentLang() === 'en';
    const allReviews = currentBiz.reviews || [];

    // Filter ulasan hanya dalam rentang 1 bulan terakhir (30 hari)
    const cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const oneMonthReviews = allReviews.filter(r => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return !isNaN(d.getTime()) && d >= cutoffDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = '';

    if (oneMonthReviews.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 font-medium">${isEn ? 'No customer review activities in the last 1 month (30 days).' : 'Belum ada aktivitas ulasan pelanggan dalam 1 bulan terakhir (30 hari).'}</td></tr>`;
        return;
    }

    oneMonthReviews.forEach(r => {
        const d = new Date(r.date);
        const localeStr = isEn ? 'en-US' : 'id-ID';
        const timeStr = `${d.toLocaleDateString(localeStr, { day: 'numeric', month: 'short' })} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        
        let branchName = isEn ? 'Main Outlet' : 'Utama';
        if (currentBiz.branches && r.branchId) {
            const br = currentBiz.branches.find(b => b.id === r.branchId);
            if (br) branchName = br.name;
        }

        const isGoogle = r.type === 'google';
        const badge = isGoogle 
            ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">${isEn ? '✓ Channeled to Google' : '✓ Lolos ke Google'}</span>`
            : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">${isEn ? '🛡 Intercepted to WA' : '🛡 Disaring ke WA Owner'}</span>`;

        const starBadge = r.stars <= 3
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">${r.stars} ★</span>`
            : `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">${r.stars} ★</span>`;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="p-3 text-slate-500 font-medium">${timeStr}</td>
            <td class="p-3 font-semibold text-slate-700">${escapeHtml(branchName)}</td>
            <td class="p-3">
                ${starBadge}
            </td>
            <td class="p-3">${badge}</td>
            <td class="p-3 text-slate-600 max-w-xs truncate">${escapeHtml(r.comment || '-')}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Reaktif saat bahasa diubah
window.addEventListener('kataya:lang_changed', () => {
    if (currentBiz) {
        renderOverviewStats();
        renderCharts();
        renderRecentActivities();
    }
});

// 6. Section Generator Barcode & Kartu Pintar NFC (Requirements 4 & 6)
async function initQrCodeSection() {
    if (!currentBiz) return;

    const qrBranchSelect = document.getElementById('qrBranchSelect');
    qrBranchSelect.innerHTML = '';

    const branches = currentBiz.branches || [];
    if (branches.length === 0) {
        const opt = document.createElement('option');
        opt.value = 'main';
        opt.textContent = `${currentBiz.businessName} (Utama)`;
        qrBranchSelect.appendChild(opt);
    } else {
        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = `${b.name} (${b.address || 'Alamat Cabang'})`;
            qrBranchSelect.appendChild(opt);
        });
    }

    const qrSettings = currentBiz.qrSettings || {};
    if (qrSettings.bannerText) document.getElementById('qrBannerText').value = qrSettings.bannerText;
    if (qrSettings.logoUrl) document.getElementById('qrLogoUrlInput').value = qrSettings.logoUrl;

    document.getElementById('standBizName').textContent = currentBiz.businessName;
    updateQrBannerPreview();
    await renderQrCode();
}

function updateQrBannerPreview() {
    const text = document.getElementById('qrBannerText').value || 'Scan / Tap NFC untuk Beri Review!';
    document.getElementById('standBannerPreview').textContent = text;
}

function getSelectedQrUrl() {
    if (!currentBiz) return '';
    const branchSelect = document.getElementById('qrBranchSelect');
    const branchId = (branchSelect && branchSelect.value) ? branchSelect.value : 'main';
    return getFullUrl(`review.html?id=${currentBiz.id}&branch=${branchId}`);
}

async function renderQrCode() {
    if (!currentBiz) return;

    const targetUrl = getSelectedQrUrl();
    const qrDisplay = document.getElementById('qrTargetUrlDisplay');
    if (qrDisplay) qrDisplay.value = targetUrl;
    
    // Update URL display untuk NFC
    const nfcDisplay = document.getElementById('nfcUrlDisplay');
    if (nfcDisplay) nfcDisplay.value = targetUrl;

    // Update kode standee
    let standeeCode = currentBiz.standeeCode;
    if (!standeeCode) {
        const standees = window.KatayaDB ? await window.KatayaDB.getAllStandees() : [];
        const found = standees.find(s => s.businessId === currentBiz.id);
        standeeCode = found ? found.code : 'STAND-' + currentBiz.id.substring(4, 8).toUpperCase();
    }
    const codeDisplay = document.getElementById('standeeCodeDisplay');
    if (codeDisplay) {
        codeDisplay.textContent = `KODE: ${standeeCode}`;
    }

    const fgColor = '#0A1931';
    const bgColor = '#ffffff';

    const logoUrl = document.getElementById('qrLogoUrlInput') ? document.getElementById('qrLogoUrlInput').value.trim() : '';
    const widthCm = parseFloat(document.getElementById('mitraStandeeWidthCm')?.value) || 10;
    const heightCm = parseFloat(document.getElementById('mitraStandeeHeightCm')?.value) || 15;

    const canvas = document.getElementById('standeePreviewCanvas');
    const loading = document.getElementById('standeeCanvasLoading');
    if (loading) loading.classList.remove('hidden');

    try {
        let qrDataUrl = '';
        if (window.QRCodeStyling) {
            qrCodeInstance = new QRCodeStyling({
                width: 750,
                height: 750,
                type: 'canvas',
                data: targetUrl,
                image: logoUrl || undefined,
                dotsOptions: {
                    color: fgColor,
                    type: 'rounded'
                },
                backgroundOptions: {
                    color: bgColor
                },
                imageOptions: {
                    crossOrigin: 'anonymous',
                    margin: 4,
                    imageSize: 0.32
                },
                cornersSquareOptions: {
                    color: fgColor,
                    type: 'extra-rounded'
                },
                cornersDotOptions: {
                    color: fgColor,
                    type: 'dot'
                }
            });

            const rawBlob = await qrCodeInstance.getRawData('png');
            if (rawBlob) {
                qrDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(rawBlob);
                });
            }
        }

        if (canvas && window.KatayaStandee) {
            await window.KatayaStandee.renderStandeeToCanvas(canvas, {
                standeeCode: standeeCode,
                title: currentBiz.businessName,
                subtitle: 'Bantu Kami Dengan',
                isRegistered: true,
                targetUrl: targetUrl,
                qrDataUrl: qrDataUrl,
                widthCm: widthCm,
                heightCm: heightCm
            });
        }
    } catch (err) {
        console.error('Error render QR canvas:', err);
    } finally {
        if (loading) loading.classList.add('hidden');
    }
}

function handleQrLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('qrLogoUrlInput').value = e.target.result;
            renderQrCode();
        };
        reader.readAsDataURL(file);
    }
}

function handleQrLogoUrlInput() {
    renderQrCode();
}

function clearQrLogo() {
    document.getElementById('qrLogoUrlInput').value = '';
    document.getElementById('qrLogoFileInput').value = '';
    renderQrCode();
}

function copyCurrentQrUrl() {
    const url = document.getElementById('qrTargetUrlDisplay').value;
    navigator.clipboard.writeText(url).then(() => {
        alert('Tautan ulasan cabang berhasil disalin!');
    });
}

function copyNfcUrl() {
    const url = document.getElementById('nfcUrlDisplay').value;
    navigator.clipboard.writeText(url).then(() => {
        alert('Tautan Kartu Pintar NFC berhasil disalin! Anda dapat menuliskannya ke chip NFC menggunakan aplikasi smartphone.');
    });
}

async function saveQrSettings() {
    if (!currentBiz) return;
    const bannerText = document.getElementById('qrBannerText') ? document.getElementById('qrBannerText').value : 'Scan / Tap NFC untuk Beri Review!';
    const logoUrl = document.getElementById('qrLogoUrlInput') ? document.getElementById('qrLogoUrlInput').value : '';

    currentBiz.qrSettings = {
        fgColor: '#0A1931',
        bgColor: '#ffffff',
        bannerText,
        logoUrl
    };

    await window.KatayaDB.updateBusiness(currentBiz.id, { qrSettings: currentBiz.qrSettings });
    alert('Desain Barcode/Stand Meja berhasil disimpan!');
}

function downloadQrImage(extension = 'png') {
    if (qrCodeInstance) {
        const safeName = currentBiz.businessName.replace(/\s+/g, '_');
        qrCodeInstance.download({ name: `QR_Review_${safeName}`, extension: extension });
    }
}

function setMitraStandeePreset(w, h, btnEl) {
    const widthInput = document.getElementById('mitraStandeeWidthCm');
    const heightInput = document.getElementById('mitraStandeeHeightCm');
    if (widthInput) widthInput.value = w;
    if (heightInput) heightInput.value = h;
    onMitraSizeInputChange();
}
window.setMitraStandeePreset = setMitraStandeePreset;

function onMitraSizeInputChange() {
    const widthInput = document.getElementById('mitraStandeeWidthCm');
    const heightInput = document.getElementById('mitraStandeeHeightCm');
    const w = parseFloat(widthInput ? widthInput.value : 10) || 10;
    const h = parseFloat(heightInput ? heightInput.value : 15) || 15;
    const isVert = (w / h) < 0.90;

    const mockupEl = document.getElementById('tableStandMockup');
    if (mockupEl) {
        mockupEl.style.aspectRatio = `${w} / ${h}`;
    }

    const badge = document.getElementById('standeeSizeLabelBadge');
    if (badge) badge.textContent = `${w} × ${h} cm (${isVert ? 'NFC di Bawah' : 'NFC di Kiri'})`;

    const dlLabel = document.getElementById('btnDownloadStandeeLabel');
    if (dlLabel) dlLabel.textContent = `Unduh Kartu Barcode Akrilik (${w}×${h} cm HD)`;

    const printLabel = document.getElementById('btnPrintStandeeLabel');
    if (printLabel) printLabel.textContent = `Cetak Stand Meja Sesuai Ukuran (${w}×${h} cm)`;

    renderQrCode();
}
window.onMitraSizeInputChange = onMitraSizeInputChange;

// Unduh Standee Meja Akrilik (Dimensi Centimeter Sesuai Pilihan)
async function downloadBerryPinkStandee() {
    if (!currentBiz) {
        alert('Data bisnis tidak ditemukan.');
        return;
    }
    if (!window.KatayaStandee) {
        alert('Modul generator standee meja belum siap. Silakan muat ulang halaman.');
        return;
    }

    const branchId = document.getElementById('qrBranchSelect') ? document.getElementById('qrBranchSelect').value : 'main';
    const branches = currentBiz.branches || [];
    const branch = branches.find(b => b.id === branchId) || { name: currentBiz.businessName };
    const targetUrl = getSelectedQrUrl();

    // Dimensi centimeter dari input
    const widthCm = parseFloat(document.getElementById('mitraStandeeWidthCm')?.value) || 10;
    const heightCm = parseFloat(document.getElementById('mitraStandeeHeightCm')?.value) || 15;

    // Buat atau ambil kode standee
    let standeeCode = currentBiz.standeeCode;
    if (!standeeCode) {
        const standees = window.KatayaDB ? await window.KatayaDB.getAllStandees() : [];
        const found = standees.find(s => s.businessId === currentBiz.id);
        if (found) {
            standeeCode = found.code;
        } else if (window.KatayaDB && typeof window.KatayaDB.createStandee === 'function') {
            const newStandee = await window.KatayaDB.createStandee(null, `${currentBiz.businessName} - ${branch.name}`, currentBiz.id);
            standeeCode = newStandee.code;
        } else {
            standeeCode = 'STAND-KATAYA';
        }
    }

    const offscreenCanvas = document.createElement('canvas');

    let qrDataUrl = '';
    try {
        if (window.QRCodeStyling) {
            const qr = new QRCodeStyling({
                width: 750,
                height: 750,
                type: 'canvas',
                data: targetUrl,
                dotsOptions: {
                    color: '#BE123C',
                    type: 'rounded'
                },
                cornersSquareOptions: {
                    color: '#0A1931',
                    type: 'extra-rounded'
                },
                cornersDotOptions: {
                    color: '#E01A8A',
                    type: 'dot'
                },
                backgroundOptions: {
                    color: '#FFFFFF'
                },
                imageOptions: {
                    crossOrigin: 'anonymous',
                    margin: 6
                }
            });
            const rawBlob = await qr.getRawData('png');
            if (rawBlob) {
                qrDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(rawBlob);
                });
            }
        }

        await window.KatayaStandee.renderStandeeToCanvas(offscreenCanvas, {
            standeeCode: standeeCode,
            title: currentBiz.businessName,
            subtitle: 'Bantu Kami Dengan',
            isRegistered: true,
            targetUrl: targetUrl,
            qrDataUrl: qrDataUrl,
            widthCm: widthCm,
            heightCm: heightCm
        });

        const safeName = currentBiz.businessName.replace(/[^a-zA-Z0-9]/g, '_');
        window.KatayaStandee.downloadStandeeAsPng(offscreenCanvas, `Standee_Meja_Kataya_${safeName}_${widthCm}x${heightCm}cm.png`);
    } catch (err) {
        console.error('Gagal generate standee:', err);
        alert('Terjadi kesalahan saat membuat standee meja. Silakan coba lagi.');
    }
}
window.downloadBerryPinkStandee = downloadBerryPinkStandee;

async function printStandTable() {
    if (!currentBiz) {
        alert('Data bisnis tidak ditemukan.');
        return;
    }
    if (!window.KatayaStandee) {
        alert('Modul generator standee meja belum siap. Silakan muat ulang halaman.');
        return;
    }

    const branchId = document.getElementById('qrBranchSelect') ? document.getElementById('qrBranchSelect').value : 'main';
    const branches = currentBiz.branches || [];
    const branch = branches.find(b => b.id === branchId) || { name: currentBiz.businessName };
    const targetUrl = getSelectedQrUrl();
    const widthCm = parseFloat(document.getElementById('mitraStandeeWidthCm')?.value) || 10;
    const heightCm = parseFloat(document.getElementById('mitraStandeeHeightCm')?.value) || 15;

    let standeeCode = currentBiz.standeeCode || 'STAND-KATAYA';

    const offscreenCanvas = document.createElement('canvas');
    let qrDataUrl = '';
    try {
        if (window.QRCodeStyling) {
            const qr = new QRCodeStyling({
                width: 750,
                height: 750,
                type: 'canvas',
                data: targetUrl,
                dotsOptions: { color: '#BE123C', type: 'rounded' },
                cornersSquareOptions: { color: '#0A1931', type: 'extra-rounded' },
                cornersDotOptions: { color: '#E01A8A', type: 'dot' },
                backgroundOptions: { color: '#FFFFFF' }
            });
            const rawBlob = await qr.getRawData('png');
            if (rawBlob) {
                qrDataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(rawBlob);
                });
            }
        }

        await window.KatayaStandee.renderStandeeToCanvas(offscreenCanvas, {
            standeeCode: standeeCode,
            title: currentBiz.businessName.toUpperCase(),
            subtitle: `Scan atau Tap NFC untuk Beri Ulasan Google (${branch.name})`,
            isRegistered: true,
            targetUrl: targetUrl,
            qrDataUrl: qrDataUrl,
            widthCm: widthCm,
            heightCm: heightCm
        });

        const imgDataUrl = offscreenCanvas.toDataURL('image/png');
        const printWin = window.open('', '_blank');
        if (!printWin) {
            window.print();
            return;
        }

        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Cetak Standee Meja - ${currentBiz.businessName} (${widthCm} x ${heightCm} cm)</title>
                <style>
                    @page {
                        size: auto;
                        margin: 10mm;
                    }
                    body {
                        margin: 0;
                        padding: 20px;
                        background: #f8fafc;
                        font-family: system-ui, -apple-system, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .print-card-wrapper {
                        width: ${widthCm}cm;
                        height: ${heightCm}cm;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                        border-radius: 12px;
                        overflow: hidden;
                        background: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .print-card-wrapper img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                        display: block;
                    }
                    .info-bar {
                        margin-bottom: 12px;
                        font-size: 12px;
                        color: #64748b;
                        font-weight: 600;
                    }
                    @media print {
                        body {
                            padding: 0;
                            background: transparent;
                        }
                        .info-bar {
                            display: none;
                        }
                        .print-card-wrapper {
                            box-shadow: none;
                            border: 1px dashed #cbd5e1;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="info-bar">Ukuran Fisik Kartu: ${widthCm} × ${heightCm} cm — Siap Cetak Lembar Akrilik</div>
                <div class="print-card-wrapper">
                    <img src="${imgDataUrl}" alt="Standee Meja">
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 400);
                    };
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    } catch (err) {
        console.error('Error saat print standee:', err);
        window.print();
    }
}
window.printStandTable = printStandTable;
window.printStandAcrylic = printStandTable; // Backwards compatibility

// 7. Section Manajemen Cabang & Lokasi (Requirements 1 & 2)
function renderBranchesSection() {
    if (!currentBiz) return;

    document.getElementById('inputEditPlaceId').value = currentBiz.placeId;
    document.getElementById('inputEditWhatsapp').value = currentBiz.whatsapp;

    const branches = currentBiz.branches || [];
    const currentPkg = currentBiz.packageType || 'single';

    // Cek Batasan Paket:
    const warningEl = document.getElementById('branchLimitWarning');
    const warningTextEl = document.getElementById('branchLimitText');
    let limitReached = false;

    if (currentPkg === 'single' && branches.length >= 1) {
        limitReached = true;
        warningTextEl.textContent = 'Paket Single Outlet (Rp 50rb) dibatasi hanya untuk 1 cabang. Silakan upgrade ke Paket Multi Cabang (Rp 100rb) untuk menambah hingga 3 cabang.';
    } else if (currentPkg === 'multi' && branches.length >= 3) {
        limitReached = true;
        warningTextEl.textContent = 'Batas maksimal 3 cabang untuk Paket Multi Cabang telah tercapai. Silakan upgrade ke Paket Limit Franchise (Rp 500rb) untuk menambah cabang tanpa batas.';
    }

    if (limitReached) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }

    // Isi tabel daftar cabang
    const tbody = document.getElementById('tableBranchesBody');
    tbody.innerHTML = '';

    branches.forEach((br, index) => {
        const branchReviewUrl = getFullUrl(`review.html?id=${encodeURIComponent(currentBiz.id)}&branch=${encodeURIComponent(br.id)}`);

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800"></td>
            <td class="p-3 text-slate-600"></td>
            <td class="p-3 font-mono text-[11px] text-blue-600"></td>
            <td class="p-3">
                <div class="flex items-center gap-1.5">
                    <input type="text" readonly class="bg-white border rounded p-1 text-[11px] font-mono w-48 truncate url-input">
                    <button class="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded font-bold text-[10px] copy-btn">Salin</button>
                </div>
            </td>
            <td class="p-3 text-center">
                <a target="_blank" rel="noopener noreferrer" class="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold mr-1 open-btn">Buka</a>
            </td>
        `;

        const tds = tr.querySelectorAll('td');
        tds[0].textContent = br.name;
        tds[1].textContent = br.address || '-';
        tds[2].textContent = br.placeId;
        
        tr.querySelector('.url-input').value = branchReviewUrl;
        
        tr.querySelector('.copy-btn').addEventListener('click', () => copyText(branchReviewUrl));
        tr.querySelector('.open-btn').href = branchReviewUrl;
        
        if (index > 0) {
            const delBtn = document.createElement('button');
            delBtn.className = 'px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-xs font-bold';
            delBtn.textContent = 'Hapus';
            delBtn.addEventListener('click', () => deleteBranch(br.id));
            tds[4].appendChild(delBtn);
        }

        tbody.appendChild(tr);
    });
}

// 7.1 Update Alamat / Place ID jika pindah lokasi
async function handleUpdateMainAddress(e) {
    e.preventDefault();
    if (!currentBiz) return;

    let newPlaceId = document.getElementById('inputEditPlaceId').value.trim();
    const newWhatsapp = document.getElementById('inputEditWhatsapp').value.trim().replace(/\D/g, '').replace(/^0/, '62');

    if (newPlaceId.includes('placeid=')) {
        const match = newPlaceId.match(/placeid=([^&]+)/);
        if (match) newPlaceId = match[1];
    }

    currentBiz.placeId = newPlaceId;
    currentBiz.whatsapp = newWhatsapp;

    if (currentBiz.branches && currentBiz.branches.length > 0) {
        currentBiz.branches[0].placeId = newPlaceId;
        currentBiz.branches[0].whatsapp = newWhatsapp;
    }

    await window.KatayaDB.updateBusiness(currentBiz.id, {
        placeId: newPlaceId,
        whatsapp: newWhatsapp,
        branches: currentBiz.branches
    });

    alert('Alamat & Place ID Google bisnis berhasil diperbarui!');
    await loadDashboard(currentBiz.id);
}

// 7.2 Tambah Cabang Baru (Mendapatkan link unik tersendiri)
async function handleAddBranch(e) {
    e.preventDefault();
    if (!currentBiz) return;

    const branches = currentBiz.branches || [];
    const currentPkg = currentBiz.packageType || 'single';

    // Cek batas sebelum tambah
    if (currentPkg === 'single' && branches.length >= 1) {
        alert('Paket Anda adalah Single Outlet (Rp 50rb) yang hanya mengizinkan 1 cabang. Silakan upgrade ke Paket Multi Cabang di tab Upgrade Paket.');
        switchTab('tabUpgradePackage');
        return;
    } else if (currentPkg === 'multi' && branches.length >= 3) {
        alert('Batas 3 cabang untuk Paket Multi Cabang telah tercapai. Silakan upgrade ke Paket Limit Franchise (Rp 500rb) untuk menambah cabang tanpa batas.');
        switchTab('tabUpgradePackage');
        return;
    }

    const name = document.getElementById('inputNewBranchName').value.trim();
    let placeId = document.getElementById('inputNewBranchPlaceId').value.trim();
    const address = document.getElementById('inputNewBranchAddress').value.trim();
    let whatsapp = document.getElementById('inputNewBranchWhatsapp').value.trim();

    if (placeId.includes('placeid=')) {
        const match = placeId.match(/placeid=([^&]+)/);
        if (match) placeId = match[1];
    }

    if (!whatsapp) whatsapp = currentBiz.whatsapp;
    else whatsapp = whatsapp.replace(/\D/g, '').replace(/^0/, '62');

    const newBranch = {
        id: 'branch_' + Date.now(),
        name,
        placeId,
        address: address || 'Alamat Cabang',
        whatsapp,
        createdAt: new Date().toISOString()
    };

    currentBiz.branches = currentBiz.branches || [];
    currentBiz.branches.push(newBranch);

    await window.KatayaDB.updateBusiness(currentBiz.id, { branches: currentBiz.branches });

    document.getElementById('formAddBranch').reset();
    alert(`Cabang "${name}" berhasil ditambahkan! Link review & fasilitas NFC unik telah siap.`);
    await loadDashboard(currentBiz.id);
}

async function deleteBranch(branchId) {
    if (!confirm('Apakah Anda yakin ingin menghapus cabang ini?')) return;
    currentBiz.branches = currentBiz.branches.filter(b => b.id !== branchId);
    await window.KatayaDB.updateBusiness(currentBiz.id, { branches: currentBiz.branches });
    await loadDashboard(currentBiz.id);
}

// 8. Kustomisasi Tampilan Halaman Rating (Memakai Verifikasi PIN)
function loadAppearanceSettings() {
    if (!currentBiz) return;

    const settings = currentBiz.settings || {};
    document.getElementById('settingBusinessName').value = currentBiz.businessName;
    document.getElementById('settingLogoUrl').value = settings.logoUrl || '';
    document.getElementById('settingPrimaryColor').value = settings.primaryColor || '#BE123C';
    document.getElementById('settingPrimaryColorHex').textContent = settings.primaryColor || '#BE123C';
    document.getElementById('settingBgColor').value = settings.bgColor || '#0A1931';
    document.getElementById('settingBgColorHex').textContent = settings.bgColor || '#0A1931';
    document.getElementById('settingInviteText').value = settings.inviteText || 'Bagikan pengalaman terbaik Anda bersama kami!';
    document.getElementById('settingWaTemplate').value = settings.waComplaintTemplate || 'Halo {businessName}, saya ingin menyampaikan masukan/keluhan mengenai kunjungan saya: {comment} (Rating: {stars} Bintang)';

    // Reset input PIN konfirmasi dan pesan kesalahan
    const pinInput = document.getElementById('settingConfirmPin');
    if (pinInput) pinInput.value = '';
    const pinErr = document.getElementById('settingPinError');
    if (pinErr) pinErr.classList.add('hidden');
}

function handleSettingLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('settingLogoUrl').value = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function handleSaveAppearance(e) {
    e.preventDefault();
    if (!currentBiz) return;

    const inputPin = document.getElementById('settingConfirmPin').value.trim();
    const pinErr = document.getElementById('settingPinError');

    // Verifikasi PIN bisnis atau Master Developer PIN
    const isValidPin = (inputPin === currentBiz.pin) || (window.KatayaDB && window.KatayaDB.verifyDeveloperPin(inputPin));
    if (!isValidPin) {
        if (pinErr) pinErr.classList.remove('hidden');
        alert('PIN Keamanan Salah! Anda wajib memasukkan PIN bisnis yang valid untuk menyimpan perubahan tampilan.');
        const pinInput = document.getElementById('settingConfirmPin');
        if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
        }
        return;
    }

    if (pinErr) pinErr.classList.add('hidden');

    const newBizName = document.getElementById('settingBusinessName').value.trim();
    const logoUrl = document.getElementById('settingLogoUrl').value.trim();
    const primaryColor = document.getElementById('settingPrimaryColor').value;
    const bgColor = document.getElementById('settingBgColor').value;
    const inviteText = document.getElementById('settingInviteText').value.trim();
    const waComplaintTemplate = document.getElementById('settingWaTemplate').value.trim();

    currentBiz.businessName = newBizName;
    currentBiz.settings = {
        ...currentBiz.settings,
        logoUrl,
        primaryColor,
        bgColor,
        inviteText,
        waComplaintTemplate
    };

    await window.KatayaDB.updateBusiness(currentBiz.id, {
        businessName: newBizName,
        settings: currentBiz.settings
    });

    const pinInput = document.getElementById('settingConfirmPin');
    if (pinInput) pinInput.value = '';

    alert('Verifikasi PIN Berhasil! Tampilan halaman ulasan rating telah disimpan & diperbarui.');
    await loadDashboard(currentBiz.id);
}

// 9. Menu Upgrade Paket Layanan: Tampilkan Nomor Pembayaran & Konfirmasi WA
async function selectUpgradePackage(newPkg) {
    if (!currentBiz) return;

    const pkgTitles = {
        multi: 'Multi Cabang (Rp 100.000 - Maks 3 Cabang) + Kartu Pintar NFC',
        franchise: 'Limit Franchise (Rp 500.000 - Unlimited Cabang) + Kartu Pintar NFC'
    };

    const confirmMsg = 
        `Halo Tim Kataya, saya pemilik bisnis *${currentBiz.businessName}* telah melakukan transfer pembayaran UPGRADE PAKET ke *${pkgTitles[newPkg]}*.\n` +
        `Berikut adalah bukti transfer ke rekening resmi Kataya (a/n Widha Vebri Mardiawan). Mohon segera aktifkan lisensi cabang baru kami.`;

    const devPhone = (window.KatayaDB && typeof window.KatayaDB.getDeveloperPhone === 'function')
        ? await window.KatayaDB.getDeveloperPhone()
        : '6285856640045';
    const btnWa = document.getElementById('btnConfirmUpgradeWa');
    if (btnWa) {
        btnWa.href = `https://wa.me/${devPhone}?text=${encodeURIComponent(confirmMsg)}`;
    }

    await window.KatayaDB.upgradePackage(currentBiz.id, newPkg);
    alert(`Paket "${pkgTitles[newPkg]}" dipilih!\n\nSilakan transfer pembayaran ke nomor rekening resmi yang tertera di bawah (BCA: 1240541153 / ShopeePay & DANA: 085856640045 a/n Widha Vebri Mardiawan), lalu klik tombol konfirmasi WhatsApp untuk mengirim bukti transfer.`);
    await loadDashboard(currentBiz.id);
}

// 4. Download Laporan PDF Desain Baru
async function downloadPdfReport() {
    if (!currentBiz && window.KatayaDB) {
        const loggedBizId = sessionStorage.getItem('kataya_auth_biz_id');
        if (loggedBizId) {
            currentBiz = await window.KatayaDB.getBusinessById(loggedBizId);
        }
        if (!currentBiz) {
            const allBiz = await window.KatayaDB.getAllBusinesses();
            if (allBiz && allBiz.length > 0) currentBiz = allBiz[0];
        }
    }

    const isEn = (typeof window !== 'undefined' && window.KatayaI18n && window.KatayaI18n.getCurrentLang() === 'en');

    if (typeof window.generatePdfReport === 'function' && currentBiz) {
        try {
            window.generatePdfReport(currentBiz);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert(isEn 
                ? 'An error occurred while generating PDF report: ' + (err.message || 'Unknown error')
                : 'Terjadi kendala saat menyusun berkas PDF: ' + (err.message || 'Kesalahan sistem'));
        }
    } else if (typeof window.generatePdfReport !== 'function') {
        alert(isEn 
            ? 'PDF generator script failed to load. Please refresh this page.' 
            : 'Modul generator PDF belum siap. Silakan muat ulang halaman (Refresh).');
    } else {
        alert(isEn 
            ? 'Business data not found. Please log in first.' 
            : 'Data bisnis tidak ditemukan. Pastikan Anda telah login ke dashboard.');
    }
}

// Navigasi Tab Dashboard
async function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('border-[#E01A8A]', 'border-fuchsiaAccent', 'bg-[#0A1931]', 'text-[#E01A8A]', 'border-blue-200/90', 'border-blue-200/80', 'border-blue-600', 'bg-blue-50', 'text-blue-600', 'text-blue-700', 'font-black', 'border-amber-300', 'border-amber-400', 'bg-amber-100', 'bg-amber-500/20', 'text-amber-300', 'text-amber-800');
        b.classList.add('border-transparent', 'text-slate-300');
        const iconBox = b.querySelector('.w-8');
        if (iconBox && !b.id.includes('Upgrade')) {
            iconBox.className = 'w-8 h-8 rounded-lg bg-[#0A1931] text-slate-400 flex items-center justify-center shrink-0 transition-colors';
        }
    });

    const activeContent = document.getElementById(tabId);
    if (activeContent) activeContent.classList.remove('hidden');

    const activeBtn = document.getElementById('btn' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
    if (activeBtn) {
        if (tabId === 'tabUpgradePackage') {
            activeBtn.classList.remove('border-transparent', 'text-slate-300');
            activeBtn.classList.add('border-amber-400', 'bg-amber-500/20', 'text-amber-300', 'font-black');
        } else {
            activeBtn.classList.remove('border-transparent', 'text-slate-300');
            activeBtn.classList.add('border-[#E01A8A]', 'bg-[#0A1931]', 'text-[#E01A8A]', 'font-black');
            const iconBox = activeBtn.querySelector('.w-8');
            if (iconBox) {
                iconBox.className = 'w-8 h-8 rounded-lg bg-[#E01A8A]/20 text-[#E01A8A] flex items-center justify-center shrink-0 transition-colors';
            }
        }
    }

    if (tabId === 'tabAnalytics') {
        renderStatistics();
        renderRecentActivities();
        setTimeout(renderCharts, 50);
    } else if (tabId === 'tabQrGenerator') {
        await initQrCodeSection();
        setTimeout(async () => await renderQrCode(), 50);
    } else if (tabId === 'tabBranches') {
        renderBranchesSection();
    } else if (tabId === 'tabAppearance') {
        loadAppearanceSettings();
    }
    if (window.lucide) lucide.createIcons();
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Tautan berhasil disalin!');
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
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

// ================= PENGUNDUHAN BARCODE FORMAT .PNG SECARA MASSAL (MITRA) =================

function openBulkDownloadModal() {
    if (!currentBiz) {
        alert('Data bisnis tidak ditemukan.');
        return;
    }
    const modal = document.getElementById('modalBulkDownloadQr');
    if (modal) {
        modal.classList.remove('hidden');
        const progressWrapper = document.getElementById('bulkDownloadProgressWrapper');
        if (progressWrapper) progressWrapper.classList.add('hidden');
        const btnExec = document.getElementById('btnExecuteBulkDownloadMitra');
        if (btnExec) {
            btnExec.disabled = false;
            btnExec.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
    if (window.lucide) lucide.createIcons();
}
window.openBulkDownloadModal = openBulkDownloadModal;

function closeBulkDownloadModal() {
    const modal = document.getElementById('modalBulkDownloadQr');
    if (modal) modal.classList.add('hidden');
}
window.closeBulkDownloadModal = closeBulkDownloadModal;

function toggleBulkMitraType() {
    const type = document.querySelector('input[name="bulkMitraType"]:checked')?.value || 'tables';
    const section = document.getElementById('bulkTablesConfigSection');
    const labelTables = document.getElementById('labelBulkTypeTables');
    const labelBranches = document.getElementById('labelBulkTypeBranches');

    if (type === 'tables') {
        if (section) section.classList.remove('hidden');
        if (labelTables) labelTables.className = 'flex items-start gap-2.5 p-3 rounded-2xl border-2 border-[#BE123C] bg-pink-50/50 cursor-pointer transition-all';
        if (labelBranches) labelBranches.className = 'flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-all';
    } else {
        if (section) section.classList.add('hidden');
        if (labelTables) labelTables.className = 'flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-all';
        if (labelBranches) labelBranches.className = 'flex items-start gap-2.5 p-3 rounded-2xl border-2 border-[#BE123C] bg-pink-50/50 cursor-pointer transition-all';
    }
}
window.toggleBulkMitraType = toggleBulkMitraType;

function setBulkTableCount(num, btnEl) {
    const input = document.getElementById('inputBulkTableCount');
    if (input) input.value = num;
    document.querySelectorAll('.btn-bulk-count').forEach(btn => {
        btn.className = 'btn-bulk-count py-1.5 rounded-lg border bg-white text-slate-700 border-slate-300 hover:border-pink-400 transition-all';
    });
    if (btnEl) {
        btnEl.className = 'btn-bulk-count py-1.5 rounded-lg border bg-[#0A1931] text-white border-[#0A1931] transition-all';
    }
}
window.setBulkTableCount = setBulkTableCount;

async function executeBulkDownloadMitra() {
    if (!currentBiz) {
        alert('Data bisnis tidak ditemukan.');
        return;
    }
    if (!window.KatayaStandee) {
        alert('Modul generator standee meja belum siap. Silakan muat ulang halaman.');
        return;
    }

    const type = document.querySelector('input[name="bulkMitraType"]:checked')?.value || 'tables';
    const format = document.getElementById('bulkFormatSelect')?.value || 'standee'; // 'standee' atau 'qr_only'
    const method = document.getElementById('bulkMethodSelect')?.value || 'zip'; // 'zip' atau 'direct'
    const widthCm = parseFloat(document.getElementById('mitraStandeeWidthCm')?.value) || 10;
    const heightCm = parseFloat(document.getElementById('mitraStandeeHeightCm')?.value) || 15;

    const progressWrapper = document.getElementById('bulkDownloadProgressWrapper');
    const progressText = document.getElementById('bulkProgressText');
    const progressPercent = document.getElementById('bulkProgressPercent');
    const progressBar = document.getElementById('bulkProgressBar');
    const btnExec = document.getElementById('btnExecuteBulkDownloadMitra');

    if (progressWrapper) progressWrapper.classList.remove('hidden');
    if (btnExec) {
        btnExec.disabled = true;
        btnExec.classList.add('opacity-60', 'cursor-not-allowed');
    }

    const setProgress = (pct, text) => {
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressText) progressText.textContent = text;
    };

    setProgress(5, 'Menyiapkan berkas barcode...');

    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    const safeBizName = currentBiz.businessName.replace(/[^a-zA-Z0-9]/g, '_');
    const baseStandeeCode = currentBiz.standeeCode || `STAND-${safeBizName.substring(0, 6).toUpperCase()}`;

    const items = [];

    try {
        if (type === 'tables') {
            const tableCount = Math.min(Math.max(parseInt(document.getElementById('inputBulkTableCount')?.value, 10) || 10, 1), 100);

            for (let i = 1; i <= tableCount; i++) {
                const tableCode = `${baseStandeeCode}-T${i}`;
                const targetUrl = getFullUrl(`review.html?id=${encodeURIComponent(currentBiz.id)}&table=${i}&standee=${encodeURIComponent(tableCode)}`);

                let qrDataUrl = '';
                if (window.QRCodeStyling) {
                    const qr = new QRCodeStyling({
                        width: 750,
                        height: 750,
                        type: 'canvas',
                        data: targetUrl,
                        dotsOptions: { color: '#BE123C', type: 'rounded' },
                        cornersSquareOptions: { color: '#0A1931', type: 'extra-rounded' },
                        cornersDotOptions: { color: '#E01A8A', type: 'dot' },
                        backgroundOptions: { color: '#FFFFFF' },
                        imageOptions: { crossOrigin: 'anonymous', margin: 6 }
                    });
                    const rawBlob = await qr.getRawData('png');
                    if (rawBlob) {
                        qrDataUrl = await new Promise(res => {
                            const r = new FileReader();
                            r.onloadend = () => res(r.result);
                            r.readAsDataURL(rawBlob);
                        });
                    }
                }

                if (format === 'qr_only') {
                    items.push({
                        filename: `QR_Meja_${i}_${safeBizName}.png`,
                        dataUrl: qrDataUrl
                    });
                } else {
                    const offscreenCanvas = document.createElement('canvas');
                    await window.KatayaStandee.renderStandeeToCanvas(offscreenCanvas, {
                        standeeCode: tableCode,
                        title: currentBiz.businessName.toUpperCase(),
                        subtitle: `Scan atau Tap NFC untuk Beri Ulasan Google (Meja ${i})`,
                        isRegistered: true,
                        targetUrl: targetUrl,
                        qrDataUrl: qrDataUrl,
                        widthCm: widthCm,
                        heightCm: heightCm
                    });
                    items.push({
                        filename: `Standee_Meja_${i}_${safeBizName}_${widthCm}x${heightCm}cm.png`,
                        canvas: offscreenCanvas,
                        dataUrl: offscreenCanvas.toDataURL('image/png')
                    });
                }

                const pct = Math.round((i / tableCount) * 50);
                setProgress(pct, `Membuat gambar Meja ${i} dari ${tableCount}...`);
            }
        } else {
            // Mode Seluruh Cabang Bisnis
            const branches = (currentBiz.branches && currentBiz.branches.length > 0) ? currentBiz.branches : [];
            const allTargets = [
                { id: 'main', name: `${currentBiz.businessName} (Pusat)` },
                ...branches
            ];

            for (let i = 0; i < allTargets.length; i++) {
                const b = allTargets[i];
                const safeBranchName = (b.name || `Cabang_${i}`).replace(/[^a-zA-Z0-9]/g, '_');
                const branchCode = `${baseStandeeCode}-CAB${i}`;
                const targetUrl = b.id === 'main'
                    ? getFullUrl(`review.html?id=${encodeURIComponent(currentBiz.id)}&standee=${encodeURIComponent(branchCode)}`)
                    : getFullUrl(`review.html?id=${encodeURIComponent(currentBiz.id)}&branch=${encodeURIComponent(b.id)}&standee=${encodeURIComponent(branchCode)}`);

                let qrDataUrl = '';
                if (window.QRCodeStyling) {
                    const qr = new QRCodeStyling({
                        width: 750,
                        height: 750,
                        type: 'canvas',
                        data: targetUrl,
                        dotsOptions: { color: '#BE123C', type: 'rounded' },
                        cornersSquareOptions: { color: '#0A1931', type: 'extra-rounded' },
                        cornersDotOptions: { color: '#E01A8A', type: 'dot' },
                        backgroundOptions: { color: '#FFFFFF' },
                        imageOptions: { crossOrigin: 'anonymous', margin: 6 }
                    });
                    const rawBlob = await qr.getRawData('png');
                    if (rawBlob) {
                        qrDataUrl = await new Promise(res => {
                            const r = new FileReader();
                            r.onloadend = () => res(r.result);
                            r.readAsDataURL(rawBlob);
                        });
                    }
                }

                if (format === 'qr_only') {
                    items.push({
                        filename: `QR_Cabang_${safeBranchName}_${safeBizName}.png`,
                        dataUrl: qrDataUrl
                    });
                } else {
                    const offscreenCanvas = document.createElement('canvas');
                    await window.KatayaStandee.renderStandeeToCanvas(offscreenCanvas, {
                        standeeCode: branchCode,
                        title: currentBiz.businessName.toUpperCase(),
                        subtitle: `Scan atau Tap NFC untuk Beri Ulasan Google (${b.name})`,
                        isRegistered: true,
                        targetUrl: targetUrl,
                        qrDataUrl: qrDataUrl,
                        widthCm: widthCm,
                        heightCm: heightCm
                    });
                    items.push({
                        filename: `Standee_Cabang_${safeBranchName}_${safeBizName}_${widthCm}x${heightCm}cm.png`,
                        canvas: offscreenCanvas,
                        dataUrl: offscreenCanvas.toDataURL('image/png')
                    });
                }

                const pct = Math.round(((i + 1) / allTargets.length) * 50);
                setProgress(pct, `Membuat barcode ${b.name} (${i + 1}/${allTargets.length})...`);
            }
        }

        if (items.length === 0) {
            alert('Tidak ada barcode yang dapat diproses.');
            if (btnExec) {
                btnExec.disabled = false;
                btnExec.classList.remove('opacity-60', 'cursor-not-allowed');
            }
            return;
        }

        // Pengemasan / Pengunduhan
        if (method === 'zip') {
            const zipName = type === 'tables'
                ? `Barcode_Meja_${safeBizName}_${items.length}_Meja.zip`
                : `Barcode_Cabang_${safeBizName}_${items.length}_Cabang.zip`;

            setProgress(55, 'Mengompresi berkas ke dalam ZIP...');
            await window.KatayaStandee.downloadMultiplePngsAsZip(items, zipName, (pct, statusText) => {
                const combinedPct = 50 + Math.round(pct * 0.5);
                setProgress(combinedPct, statusText);
            });
        } else {
            setProgress(55, 'Mengunduh berkas .PNG satu per satu...');
            await window.KatayaStandee.downloadMultiplePngsDirect(items, (cur, total) => {
                const combinedPct = 50 + Math.round((cur / total) * 50);
                setProgress(combinedPct, `Mengunduh ${cur} dari ${total} file .PNG...`);
            });
        }

        setProgress(100, 'Berhasil! Seluruh file .PNG telah diunduh.');
        setTimeout(() => {
            closeBulkDownloadModal();
        }, 2200);

    } catch (err) {
        console.error('Error saat proses unduh massal:', err);
        alert('Terjadi kesalahan saat mengunduh barcode massal: ' + err.message);
    } finally {
        if (btnExec) {
            btnExec.disabled = false;
            btnExec.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
}
window.executeBulkDownloadMitra = executeBulkDownloadMitra;

async function downloadAllBranchesBarcodeZip() {
    openBulkDownloadModal();
    const radioBranches = document.querySelector('input[name="bulkMitraType"][value="branches"]');
    if (radioBranches) {
        radioBranches.checked = true;
        toggleBulkMitraType();
    }
    const methodSelect = document.getElementById('bulkMethodSelect');
    if (methodSelect) methodSelect.value = 'zip';
}
window.downloadAllBranchesBarcodeZip = downloadAllBranchesBarcodeZip;

