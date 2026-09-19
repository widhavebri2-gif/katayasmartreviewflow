/**
 * Kataya Smart Review Flow - Database Engine (SUPABASE)
 * Menggantikan versi localStorage. Nama & tanda tangan fungsi window.KatayaDB
 * DIPERTAHANKAN sama seperti sebelumnya, TAPI sekarang setiap fungsi yang
 * mengakses data mengembalikan Promise (harus dipanggil pakai `await` atau `.then()`).
 *
 * SEBELUM FILE INI DIPAKAI:
 * 1. Tambahkan <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *    SEBELUM <script src="assets/js/db.js"> di SETIAP file HTML.
 * 2. Isi KATAYA_SUPABASE_URL dan KATAYA_SUPABASE_ANON_KEY di bawah ini
 *    dengan nilai dari Supabase Dashboard > Project Settings > API.
 * 3. Jalankan supabase-schema.sql di Supabase SQL Editor.
 */

const KATAYA_SUPABASE_URL = 'https://jpfcogtkxnlmfetnsxyl.supabase.co';
const KATAYA_SUPABASE_ANON_KEY = 'sb_publishable_bbCkoP-O5b2ypd-N10dELQ_Cj6jcE52';

const _sb = window.supabase.createClient(KATAYA_SUPABASE_URL, KATAYA_SUPABASE_ANON_KEY);

const DEVELOPER_PIN = '2202';
const DEFAULT_DEV_PHONE = '6285856640045';

// ================= SANITASI (tetap sama, tidak butuh network) =================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

function sanitizeText(str, maxLen = 200) {
    if (!str) return '';
    return String(str).replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}
window.sanitizeText = sanitizeText;

// ================= PROTEKSI BRUTE-FORCE (tetap per-device, pakai sessionStorage) =================
const LOGIN_SECURITY = {
    MAX_ATTEMPTS: 3,
    LOCKOUT_MS: 60 * 1000,

    checkLockout(key) {
        try {
            const data = JSON.parse(sessionStorage.getItem('lockout_' + key) || '{}');
            if (data.lockedUntil && Date.now() < data.lockedUntil) {
                const waitSec = Math.ceil((data.lockedUntil - Date.now()) / 1000);
                return { locked: true, waitSeconds: waitSec };
            }
            return { locked: false, waitSeconds: 0 };
        } catch (e) {
            return { locked: false, waitSeconds: 0 };
        }
    },

    recordFailedAttempt(key) {
        try {
            const data = JSON.parse(sessionStorage.getItem('lockout_' + key) || '{}');
            const attempts = (data.attempts || 0) + 1;
            if (attempts >= this.MAX_ATTEMPTS) {
                const lockedUntil = Date.now() + this.LOCKOUT_MS;
                sessionStorage.setItem('lockout_' + key, JSON.stringify({ attempts: 0, lockedUntil }));
                return { locked: true, waitSeconds: 60 };
            } else {
                sessionStorage.setItem('lockout_' + key, JSON.stringify({ attempts, lockedUntil: 0 }));
                return { locked: false, remainingAttempts: this.MAX_ATTEMPTS - attempts };
            }
        } catch (e) {
            return { locked: false, remainingAttempts: 3 };
        }
    },

    clearAttempts(key) {
        try {
            sessionStorage.removeItem('lockout_' + key);
        } catch (e) {}
    }
};

// ================= KONVERSI BARIS SUPABASE <-> OBJEK BISNIS (camelCase, sama seperti sebelumnya) =================
function rowToBiz(row) {
    if (!row) return null;
    return {
        id: row.id,
        pin: row.pin,
        businessName: row.business_name,
        businessType: row.business_type,
        placeId: row.place_id,
        whatsapp: row.whatsapp,
        status: row.status,
        packageType: row.package_type,
        activationToken: row.activation_token,
        activationUsed: row.activation_used,
        hasNfcFeature: row.has_nfc_feature,
        standeeCode: row.standee_code,
        googleRating: row.google_rating,
        googleReviewCount: row.google_review_count,
        createdAt: row.created_at,
        activatedAt: row.activated_at,
        lastAccessedAt: row.last_accessed_at,
        upgradedAt: row.upgraded_at,
        branches: row.branches || [],
        settings: row.settings || {},
        qrSettings: row.qr_settings || {},
        reviews: row.reviews || []
    };
}

function bizToRow(biz) {
    const row = {};
    if (biz.id !== undefined) row.id = biz.id;
    if (biz.pin !== undefined) row.pin = biz.pin;
    if (biz.businessName !== undefined) row.business_name = biz.businessName;
    if (biz.businessType !== undefined) row.business_type = biz.businessType;
    if (biz.placeId !== undefined) row.place_id = biz.placeId;
    if (biz.whatsapp !== undefined) row.whatsapp = biz.whatsapp;
    if (biz.status !== undefined) row.status = biz.status;
    if (biz.packageType !== undefined) row.package_type = biz.packageType;
    if (biz.activationToken !== undefined) row.activation_token = biz.activationToken;
    if (biz.activationUsed !== undefined) row.activation_used = biz.activationUsed;
    if (biz.hasNfcFeature !== undefined) row.has_nfc_feature = biz.hasNfcFeature;
    if (biz.standeeCode !== undefined) row.standee_code = biz.standeeCode;
    if (biz.googleRating !== undefined) row.google_rating = biz.googleRating;
    if (biz.googleReviewCount !== undefined) row.google_review_count = biz.googleReviewCount;
    if (biz.createdAt !== undefined) row.created_at = biz.createdAt;
    if (biz.activatedAt !== undefined) row.activated_at = biz.activatedAt;
    if (biz.lastAccessedAt !== undefined) row.last_accessed_at = biz.lastAccessedAt;
    if (biz.upgradedAt !== undefined) row.upgraded_at = biz.upgradedAt;
    if (biz.branches !== undefined) row.branches = biz.branches;
    if (biz.settings !== undefined) row.settings = biz.settings;
    if (biz.qrSettings !== undefined) row.qr_settings = biz.qrSettings;
    if (biz.reviews !== undefined) row.reviews = biz.reviews;
    return row;
}

// ================= NOMOR WA DEVELOPER (app_config) =================
async function getDeveloperPhone() {
    try {
        const { data, error } = await _sb.from('app_config').select('value').eq('key', 'dev_bot_phone').maybeSingle();
        if (error || !data) return DEFAULT_DEV_PHONE;
        return data.value || DEFAULT_DEV_PHONE;
    } catch (e) {
        return DEFAULT_DEV_PHONE;
    }
}

async function setDeveloperPhone(phone) {
    if (!phone) return getDeveloperPhone();
    const clean = String(phone).replace(/\D/g, '').replace(/^0/, '62');
    if (clean.length < 8) return false;
    try {
        await _sb.from('app_config').update({ value: clean }).eq('key', 'dev_bot_phone');
        return clean;
    } catch (e) {
        return DEFAULT_DEV_PHONE;
    }
}

// ================= BISNIS =================
async function getAllBusinesses() {
    try {
        const { data, error } = await _sb.from('businesses').select('*').order('created_at', { ascending: false });
        if (error) { console.error('getAllBusinesses:', error); return []; }
        return (data || []).map(rowToBiz);
    } catch (e) {
        console.error('getAllBusinesses:', e);
        return [];
    }
}

// Dipertahankan untuk kompatibilitas; menimpa SELURUH tabel (jarang dipakai langsung)
async function saveAllBusinesses(list) {
    if (!Array.isArray(list)) return false;
    try {
        const rows = list.map(bizToRow);
        const { error } = await _sb.from('businesses').upsert(rows, { onConflict: 'id' });
        return !error;
    } catch (e) {
        console.error('saveAllBusinesses:', e);
        return false;
    }
}

async function registerBusiness({ businessName, businessType = '', placeId, whatsapp, pin, packageType = 'single', standeeCode = undefined }) {
    const id = 'biz_' + Date.now();
    const cleanName = sanitizeText(businessName, 100) || 'Bisnis Mitra';
    const cleanType = sanitizeText(businessType, 60) || 'Kuliner (F&B)';
    const cleanPlaceId = sanitizeText(placeId, 120);
    const cleanWhatsapp = String(whatsapp).replace(/\D/g, '').replace(/^0/, '62');
    const cleanPin = String(pin || '1234').replace(/\D/g, '').slice(0, 10) || '1234';
    const validPackages = ['single', 'multi', 'franchise'];
    const validPkg = validPackages.includes(packageType) ? packageType : 'single';
    const activationToken = 'tok_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const devPhone = await getDeveloperPhone();
    const nowIso = new Date().toISOString();

    const newBusiness = {
        id, pin: cleanPin, businessName: cleanName, businessType: cleanType, placeId: cleanPlaceId,
        whatsapp: cleanWhatsapp, status: 'pending', packageType: validPkg, activationToken,
        activationUsed: false, hasNfcFeature: true,
        standeeCode: standeeCode ? String(standeeCode).toUpperCase().trim() : undefined,
        googleRating: 4.9, googleReviewCount: 18, createdAt: nowIso, lastAccessedAt: nowIso,
        branches: [{ id: 'branch_main_' + id, name: cleanName + ' (Pusat)', placeId: cleanPlaceId, address: 'Lokasi Utama', whatsapp: cleanWhatsapp, createdAt: nowIso }],
        settings: {
            logoUrl: '', primaryColor: '#BE123C', bgColor: '#0A1931', cardBgColor: '#ffffff',
            inviteText: 'Bagikan pengalaman terbaik Anda bersama kami!',
            waComplaintTemplate: 'Halo {businessName}, saya ingin menyampaikan masukan/keluhan mengenai kunjungan saya: {comment} (Rating: {stars} Bintang)',
            csWhatsapp: devPhone
        },
        qrSettings: { fgColor: '#1e293b', bgColor: '#ffffff', logoUrl: '', bannerText: 'Scan / Tap NFC untuk Beri Review!', frameStyle: 'rounded' },
        reviews: []
    };

    const { error } = await _sb.from('businesses').insert(bizToRow(newBusiness));
    if (error) { console.error('registerBusiness:', error); return null; }
    return newBusiness;
}

async function getBusinessById(id) {
    if (!id) return null;
    try {
        const { data, error } = await _sb.from('businesses').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return rowToBiz(data);
    } catch (e) {
        return null;
    }
}

async function updateBusiness(id, updatedFields) {
    if (!id || !updatedFields) return null;
    try {
        const row = bizToRow(updatedFields);
        const { data, error } = await _sb.from('businesses').update(row).eq('id', id).select().maybeSingle();
        if (error || !data) return null;
        return rowToBiz(data);
    } catch (e) {
        console.error('updateBusiness:', e);
        return null;
    }
}

async function activateBusiness(bizId, token, devPin) {
    if (!verifyDeveloperPin(devPin)) {
        return { success: false, message: 'Sandi developer salah!' };
    }
    const biz = await getBusinessById(bizId);
    if (!biz) return { success: false, message: 'Bisnis tidak ditemukan dalam sistem.' };
    if (biz.activationToken !== token) return { success: false, message: 'Token tautan aktivasi tidak valid.' };
    if (biz.activationUsed) {
        const usedDate = biz.activatedAt ? new Date(biz.activatedAt).toLocaleString('id-ID') : 'sebelumnya';
        return { success: false, alreadyUsed: true, message: `Tautan aktivasi ini sudah pernah digunakan pada ${usedDate} dan tidak dapat dipakai lagi.` };
    }
    const updated = await updateBusiness(bizId, { status: 'active', activationUsed: true, activatedAt: new Date().toISOString() });
    if (!updated) return { success: false, message: 'Gagal mengaktifkan bisnis.' };
    return { success: true, business: updated };
}

async function upgradePackage(bizId, newPackageType) {
    const validPackages = ['single', 'multi', 'franchise'];
    const pkg = validPackages.includes(newPackageType) ? newPackageType : 'single';
    return updateBusiness(bizId, { packageType: pkg, upgradedAt: new Date().toISOString() });
}

async function recordReview(businessId, branchIdOrObj, stars, type, comment = '') {
    const biz = await getBusinessById(businessId);
    if (!biz) return null;

    let branchId = 'main', validStars = 5, validType = 'google', cleanComment = '', deviceId = null;
    if (typeof branchIdOrObj === 'object' && branchIdOrObj !== null) {
        branchId = branchIdOrObj.branchId || 'main';
        validStars = Math.max(1, Math.min(5, parseInt(branchIdOrObj.stars, 10) || 5));
        validType = (branchIdOrObj.type === 'google') ? 'google' : 'whatsapp';
        cleanComment = sanitizeText(branchIdOrObj.comment, 500);
        deviceId = branchIdOrObj.deviceId || null;
    } else {
        branchId = branchIdOrObj || 'main';
        validStars = Math.max(1, Math.min(5, parseInt(stars, 10) || 5));
        validType = (type === 'google') ? 'google' : 'whatsapp';
        cleanComment = sanitizeText(comment, 500);
    }

    const newReview = {
        id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        stars: validStars, date: new Date().toISOString(), type: validType, comment: cleanComment,
        branchId: sanitizeText(branchId, 50), deviceId: deviceId || getOrCreateDeviceId()
    };

    const reviews = [...(biz.reviews || []), newReview];
    const updated = await updateBusiness(businessId, { reviews, lastAccessedAt: new Date().toISOString() });
    return updated ? newReview : null;
}

async function touchBusinessActivity(bizId) {
    if (!bizId) return null;
    return updateBusiness(bizId, { lastAccessedAt: new Date().toISOString() });
}

function getAccountInactivityInfo(biz) {
    if (!biz) return { isExpired: false, isWarning: false, daysInactive: 0, daysRemaining: 365, formattedDate: '-' };
    const lastAccess = biz.lastAccessedAt ? new Date(biz.lastAccessedAt) : new Date(biz.createdAt || Date.now());
    const now = new Date();
    const diffMs = now.getTime() - lastAccess.getTime();
    const daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, 365 - daysInactive);
    const isExpired = daysInactive >= 365;
    const isWarning = daysInactive >= 300 && !isExpired;
    const formattedDate = lastAccess.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return { lastAccessedAt: lastAccess.toISOString(), formattedDate, daysInactive, daysRemaining, isExpired, isWarning };
}

async function deleteBusiness(bizId) {
    if (!bizId) return null;
    const biz = await getBusinessById(bizId);
    if (!biz) return null;
    const { error } = await _sb.from('businesses').delete().eq('id', bizId);
    if (error) { console.error('deleteBusiness:', error); return null; }
    return biz;
}

async function autoCleanupExpiredAccounts() {
    const list = await getAllBusinesses();
    const deleted = [];
    for (const biz of list) {
        const info = getAccountInactivityInfo(biz);
        if (info.isExpired) {
            await _sb.from('businesses').delete().eq('id', biz.id);
            deleted.push(biz);
        }
    }
    return deleted;
}

async function resetBusinessPinByWhatsapp(rawWhatsapp, newPin) {
    const cleanPhone = String(rawWhatsapp).replace(/\D/g, '').replace(/^0/, '62');
    const cleanPin = String(newPin).trim().replace(/\D/g, '').slice(0, 10);
    if (!cleanPhone || !cleanPin || cleanPin.length < 4) return null;
    const { data, error } = await _sb.from('businesses').select('*').eq('whatsapp', cleanPhone).maybeSingle();
    if (error || !data) return null;
    return updateBusiness(data.id, { pin: cleanPin, lastAccessedAt: new Date().toISOString() });
}

async function changeBusinessPin(bizId, currentPin, newPin) {
    const biz = await getBusinessById(bizId);
    if (!biz) return { success: false, message: 'Bisnis tidak ditemukan dalam sistem.' };
    if (String(currentPin).trim() !== biz.pin && !verifyDeveloperPin(currentPin)) {
        return { success: false, message: 'PIN saat ini salah! Periksa kembali PIN lama Anda.' };
    }
    const cleanNewPin = String(newPin).trim().replace(/\D/g, '').slice(0, 10);
    if (!cleanNewPin || cleanNewPin.length < 4) {
        return { success: false, message: 'PIN baru minimal harus 4 digit angka.' };
    }
    const updated = await updateBusiness(bizId, { pin: cleanNewPin, lastAccessedAt: new Date().toISOString() });
    if (!updated) return { success: false, message: 'Gagal menyimpan PIN baru.' };
    return { success: true, business: updated };
}

function generateRandomPin(length = 4) {
    let pin = '';
    for (let i = 0; i < length; i++) pin += Math.floor(Math.random() * 10).toString();
    return pin;
}

// ================= BOT LOGS =================
async function getBotLogs() {
    const { data, error } = await _sb.from('bot_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) { console.error('getBotLogs:', error); return []; }
    return (data || []).map(r => ({ ...r.entry, _rowId: r.id }));
}

async function saveBotLogs(logs) {
    // Dipertahankan untuk kompatibilitas; log baru ditambah lewat _appendBotLog di dalam alur PIN
    return true;
}

async function _appendBotLog(entry) {
    await _sb.from('bot_logs').insert({ entry });
}

async function clearBotLogs() {
    await _sb.from('bot_logs').delete().neq('id', -1);
}

// ================= PERMINTAAN PIN =================
async function getAllPinRequests() {
    const { data, error } = await _sb.from('pin_requests').select('*').order('created_at', { ascending: false });
    if (error) { console.error('getAllPinRequests:', error); return []; }
    return (data || []).map(r => ({
        id: r.id, timestamp: r.created_at, businessId: r.business_id, businessName: r.business_name,
        phone: r.phone, devPhone: r.dev_phone, status: r.status, requestMessage: r.request_message,
        newPin: r.new_pin, sentAt: r.sent_at
    }));
}

async function savePinRequests(list) {
    // Dipertahankan untuk kompatibilitas; penulisan aktual terjadi di createPinRequest/sendNewPinByDeveloper
    return true;
}

async function getPendingPinRequestsCount() {
    const list = await getAllPinRequests();
    return list.filter(r => r.status === 'MENUNGGU_DEVELOPER').length;
}

async function createPinRequest(rawPhone) {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '').replace(/^0/, '62');
    const devPhone = await getDeveloperPhone();
    if (!cleanPhone) return { success: false, message: 'Nomor WhatsApp tidak valid.', devPhone };

    const { data: biz } = await _sb.from('businesses').select('*').eq('whatsapp', cleanPhone).maybeSingle();
    const nowIso = new Date().toISOString();
    const requestId = 'req_pin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    if (biz) {
        const requestMessage =
            `Halo Developer Kataya (+${devPhone}),\n\n` +
            `Saya pemilik bisnis *${biz.business_name}* (No WhatsApp: +${cleanPhone}) mengalami kendala salah PIN login.\n` +
            `Mohon bantuan untuk kirimkan kode PIN baru akun saya agar dapat masuk ke dashboard.\n\nTerima kasih.`;

        await _sb.from('pin_requests').insert({
            id: requestId, business_id: biz.id, business_name: biz.business_name, phone: cleanPhone,
            dev_phone: devPhone, status: 'MENUNGGU_DEVELOPER', request_message: requestMessage,
            created_at: nowIso
        });

        await _appendBotLog({
            id: 'bot_' + Date.now(), timestamp: nowIso, phone: cleanPhone, businessId: biz.id,
            businessName: biz.business_name, maskedPin: 'MENUNGGU DEVELOPER', recipientPhone: devPhone,
            devPhone, status: 'PERMINTAAN MASUK', note: 'Mitra salah PIN -> Mengirim pesan permohonan PIN baru ke WhatsApp Developer'
        });

        const waRequestUrl = `https://wa.me/${devPhone}?text=${encodeURIComponent(requestMessage)}`;
        return { success: true, business: rowToBiz(biz), request: { id: requestId }, cleanPhone, devPhone, waRequestUrl, message: 'Permintaan PIN baru telah dialihkan ke WhatsApp Developer.' };
    } else {
        const requestMessage = `Halo Developer Kataya,\nSaya dengan nomor WhatsApp +${cleanPhone} mencoba meminta PIN baru namun nomor belum terdaftar di sistem.`;
        const waRequestUrl = `https://wa.me/${devPhone}?text=${encodeURIComponent(requestMessage)}`;
        return { success: false, message: 'Nomor WhatsApp bisnis belum terdaftar di sistem.', cleanPhone, devPhone, waRequestUrl };
    }
}

async function sendNewPinByDeveloper(requestId) {
    const { data: req, error } = await _sb.from('pin_requests').select('*').eq('id', requestId).maybeSingle();
    if (error || !req) return { success: false, message: 'Permintaan PIN tidak ditemukan.' };

    const devPhone = await getDeveloperPhone();
    const newRandomPin = generateRandomPin(4);
    const nowIso = new Date().toISOString();

    let bizName = req.business_name;
    if (req.business_id) {
        const updated = await updateBusiness(req.business_id, { pin: newRandomPin, lastAccessedAt: nowIso });
        if (updated) bizName = updated.businessName;
    }

    LOGIN_SECURITY.clearAttempts('auth_home_' + req.phone);
    LOGIN_SECURITY.clearAttempts('dash_' + req.phone);

    await _sb.from('pin_requests').update({ status: 'SUDAH_DIKIRIM', new_pin: newRandomPin, sent_at: nowIso }).eq('id', requestId);

    await _appendBotLog({
        id: 'bot_' + Date.now(), timestamp: nowIso, phone: req.phone, businessId: req.business_id,
        businessName: bizName, maskedPin: '••••', recipientPhone: req.phone, devPhone,
        status: 'TERKIRIM KE MITRA', note: `Developer menerbitkan PIN baru acak (${newRandomPin}) & mengirimkannya langsung ke WhatsApp Mitra`
    });

    const officialReplyMessage =
        `*NOTIFIKASI RESMI DEVELOPER KATAYA*\n\nHalo *${bizName}*,\n\n` +
        `Permintaan reset PIN login Anda telah disetujui dan diproses oleh Developer Kataya (+${devPhone}).\n\n` +
        `🔐 *KODE PIN BARU ANDA*: *${newRandomPin}*\n📅 *Waktu Terbit*: ${new Date().toLocaleString('id-ID')}\n\n` +
        `⚠️ *PERINGATAN KEAMANAN*:\n• Jangan bagikan kode PIN ini kepada orang lain!\n• Gunakan kode PIN di atas untuk masuk ke Dashboard Mitra Kataya.\n\n` +
        `_Pesan resmi diterbitkan oleh Tim Pengembang Kataya (+${devPhone})._`;

    const waSendUrl = `https://wa.me/${req.phone}?text=${encodeURIComponent(officialReplyMessage)}`;
    return { success: true, newPin: newRandomPin, waSendUrl, request: { id: requestId, phone: req.phone }, message: 'PIN baru berhasil dibuat dan siap dikirim ke WhatsApp mitra.' };
}

async function handleBotRequestNewPin(rawPhone) {
    return createPinRequest(rawPhone);
}

// ================= STANDEE BARCODE =================
function generateStandeeCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    return `STAND-${rand}`;
}

async function getAllStandees() {
    const { data, error } = await _sb.from('standees').select('*').order('created_at', { ascending: false });
    if (error) { console.error('getAllStandees:', error); return []; }
    return (data || []).map(r => ({ code: r.code, businessId: r.business_id, label: r.label, createdAt: r.created_at, claimedAt: r.claimed_at }));
}

async function saveAllStandees(list) {
    // Dipertahankan untuk kompatibilitas; penulisan aktual per-standee lewat fungsi di bawah
    return true;
}

async function createStandee(customCode, label, assignBizId = null) {
    const code = (customCode || generateStandeeCode()).toUpperCase().trim();
    const { data: existing } = await _sb.from('standees').select('code').eq('code', code).maybeSingle();
    if (existing) return { success: false, message: `Kode Standee "${code}" sudah terdaftar sebelumnya!` };

    const nowIso = new Date().toISOString();
    const newStandee = { code, business_id: assignBizId || null, label: label || `Standee Meja ${code}`, created_at: nowIso, claimed_at: assignBizId ? nowIso : null };
    const { error } = await _sb.from('standees').insert(newStandee);
    if (error) return { success: false, message: 'Gagal menyimpan standee.' };

    if (assignBizId) {
        await updateBusiness(assignBizId, { standeeCode: code });
    }
    return { success: true, standee: { code, businessId: assignBizId || null, label: newStandee.label, createdAt: nowIso, claimedAt: newStandee.claimed_at } };
}

async function generateBatchStandees(count = 5, assignBizId = null, labelPrefix = 'Standee Meja') {
    const num = Math.max(1, Math.min(parseInt(count) || 5, 50));
    const existing = await getAllStandees();
    const existingCodes = new Set(existing.map(s => s.code));
    const created = [];

    for (let i = 0; i < num; i++) {
        let code = '', attempts = 0;
        do { code = generateStandeeCode(); attempts++; } while (existingCodes.has(code) && attempts < 100);
        existingCodes.add(code);
        const nowIso = new Date().toISOString();
        const row = { code, business_id: assignBizId || null, label: `${labelPrefix} ${code}`, created_at: nowIso, claimed_at: assignBizId ? nowIso : null };
        const { error } = await _sb.from('standees').insert(row);
        if (!error) created.push({ code, businessId: assignBizId || null, label: row.label, createdAt: nowIso, claimedAt: row.claimed_at });
    }
    return created;
}

async function getStandee(code) {
    if (!code) return null;
    const clean = String(code).toUpperCase().trim();
    const { data, error } = await _sb.from('standees').select('*').eq('code', clean).maybeSingle();
    if (error || !data) return null;
    return { code: data.code, businessId: data.business_id, label: data.label, createdAt: data.created_at, claimedAt: data.claimed_at };
}

async function linkStandeeToBusiness(code, bizId) {
    if (!code || !bizId) return { success: false, message: 'Kode standee dan ID bisnis diperlukan.' };
    const clean = String(code).toUpperCase().trim();
    const nowIso = new Date().toISOString();
    const existing = await getStandee(clean);

    if (!existing) {
        await _sb.from('standees').insert({ code: clean, business_id: bizId, label: `Standee Meja ${clean}`, created_at: nowIso, claimed_at: nowIso });
    } else {
        await _sb.from('standees').update({ business_id: bizId, claimed_at: nowIso }).eq('code', clean);
    }
    await updateBusiness(bizId, { standeeCode: clean });
    return { success: true, code: clean };
}

async function getBusinessByStandeeCode(code) {
    if (!code) return null;
    const clean = String(code).toUpperCase().trim();
    const standee = await getStandee(clean);
    if (standee && standee.businessId) return getBusinessById(standee.businessId);
    // Fallback: cek langsung field standee_code milik bisnis
    const { data, error } = await _sb.from('businesses').select('*').eq('standee_code', clean).maybeSingle();
    if (error || !data) return null;
    return rowToBiz(data);
}

// ================= PROTEKSI SINGLE-DEVICE (tetap per-device, tidak perlu network) =================
const DEVICE_ID_KEY = 'kataya_device_uuid';

function getOrCreateDeviceId() {
    let deviceId = '';
    try { deviceId = localStorage.getItem(DEVICE_ID_KEY); } catch (e) {}
    if (!deviceId) {
        try {
            const match = document.cookie.match(new RegExp('(^| )' + DEVICE_ID_KEY + '=([^;]+)'));
            if (match) deviceId = match[2];
        } catch (e) {}
    }
    if (!deviceId) {
        const userAgentHash = (navigator.userAgent || '').split('').reduce((acc, char) => (acc + char.charCodeAt(0)), 0);
        const screenSignature = `${window.screen ? window.screen.width : 0}x${window.screen ? window.screen.height : 0}`;
        const timezoneOffset = new Date().getTimezoneOffset();
        const randomPart = Math.random().toString(36).substring(2, 10);
        deviceId = `DEV-${Date.now().toString(36)}-${userAgentHash.toString(36)}-${screenSignature}-${timezoneOffset}-${randomPart}`;
    }
    try {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
        document.cookie = `${DEVICE_ID_KEY}=${deviceId}; path=/; max-age=31536000; SameSite=Strict`;
    } catch (e) {}
    return deviceId;
}

function hasDeviceReviewed(businessId, checkDeviceId) {
    return { hasReviewed: false };
}

async function recordDeviceReview(businessId, reviewData) {
    const deviceId = (reviewData && reviewData.deviceId) ? reviewData.deviceId : getOrCreateDeviceId();
    const enrichedReview = { ...reviewData, deviceId, reviewedAt: (reviewData && reviewData.reviewedAt) || new Date().toISOString(), timestamp: (reviewData && reviewData.timestamp) || new Date().toISOString() };
    return recordReview(businessId, enrichedReview);
}

function resetDeviceReview(businessId, pin) {
    return { success: true, message: 'Pembatasan ulasan perangkat dinonaktifkan.' };
}

// ================= AUTENTIKASI =================
function verifyDeveloperPin(inputPin) {
    if (!inputPin) return false;
    return String(inputPin).trim() === DEVELOPER_PIN;
}

async function authenticateBusiness(phone, pin) {
    if (!phone || !pin) return null;
    const cleanPhone = String(phone).replace(/\D/g, '').replace(/^0/, '62');
    const enteredPin = String(pin).trim();
    const isMasterDev = verifyDeveloperPin(enteredPin);

    const { data, error } = await _sb.from('businesses').select('*').eq('whatsapp', cleanPhone).maybeSingle();
    if (error || !data) return null;

    if (data.pin === enteredPin || isMasterDev) {
        try { sessionStorage.setItem('kataya_auth_biz_id', data.id); } catch (e) {}
        return rowToBiz(data);
    }
    return null;
}

window.KatayaDB = {
    getAllBusinesses, saveAllBusinesses, registerBusiness, getBusinessById, updateBusiness,
    deleteBusiness, activateBusiness, upgradePackage, recordReview, touchBusinessActivity,
    getAccountInactivityInfo, autoCleanupExpiredAccounts, resetBusinessPinByWhatsapp,
    changeBusinessPin, verifyDeveloperPin, authenticateBusiness,
    getAllStandees, saveAllStandees, generateStandeeCode, createStandee, generateBatchStandees,
    getStandee, linkStandeeToBusiness, getBusinessByStandeeCode,
    getDeveloperPhone, setDeveloperPhone, generateRandomPin, getBotLogs, saveBotLogs, clearBotLogs,
    handleBotRequestNewPin, getAllPinRequests, savePinRequests, createPinRequest, sendNewPinByDeveloper,
    getPendingPinRequestsCount,
    getOrCreateDeviceId, hasDeviceReviewed, recordDeviceReview, resetDeviceReview,
    LOGIN_SECURITY, escapeHtml, sanitizeText, DEVELOPER_PHONE: DEFAULT_DEV_PHONE, DEVELOPER_PIN
};
