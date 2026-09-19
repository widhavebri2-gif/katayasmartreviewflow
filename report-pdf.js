/**
 * Kataya Smart Review Flow - Generator Laporan PDF Resmi (report-pdf.js)
 * Standar Eksekutif Korporat: Tampilan mewah, tata letak presisi A4 (210mm x 297mm),
 * tipografi lega (tanpa overlap), kompatibilitas font helvetica 100% (bebas glitch unicode),
 * serta pewarnaan badge otomatis untuk ulasan Google Maps dan filter WhatsApp.
 */

function generatePdfReport(business) {
    const isEn = (typeof window !== 'undefined' && window.KatayaI18n && window.KatayaI18n.getCurrentLang() === 'en');

    if (!business) {
        alert(isEn ? 'Business data not found.' : 'Data bisnis tidak ditemukan.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert(isEn ? 'PDF library (jsPDF) is not ready. Please ensure your internet connection is active.' : 'Modul PDF jsPDF belum siap. Mohon pastikan koneksi internet stabil.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    }); // Ukuran A4: 210mm x 297mm (Lebar konten aman: 14mm s/d 196mm = 182mm)

    const reviews = business.reviews || [];
    const googleReviews = reviews.filter(r => r.type === 'google').length;
    const waComplaints = reviews.filter(r => r.type === 'whatsapp').length;
    const totalReviews = reviews.length;

    // Kalkulasi Skor Rating Google Maps
    const baseGoogleScore = business.googleRating ? parseFloat(business.googleRating) : 4.9;
    const baseGoogleCount = business.googleReviewCount ? parseInt(business.googleReviewCount, 10) : 48;
    let currentGoogleRating = baseGoogleScore.toFixed(1);

    if (googleReviews > 0) {
        const sumGoogle = reviews.filter(r => r.type === 'google').reduce((acc, r) => acc + (Number(r.stars) || 5), 0);
        const combined = ((baseGoogleScore * baseGoogleCount) + sumGoogle) / (baseGoogleCount + googleReviews);
        currentGoogleRating = (Math.min(5.0, Math.max(4.0, combined))).toFixed(1);
    }

    const packageNames = {
        single: isEn ? 'Single Outlet (1 Branch)' : 'Single Outlet (1 Cabang)',
        multi: isEn ? 'Multi Branches (Max 3 Branches)' : 'Multi Cabang (Maks 3 Cabang)',
        franchise: isEn ? 'Franchise Limit (Unlimited Branches)' : 'Limit Franchise (Tanpa Batas Cabang)'
    };
    const packageName = packageNames[business.packageType] || (isEn ? 'Standard License' : 'Lisensi Standar');
    const branchesCount = (business.branches && business.branches.length) || 1;

    const reportDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const reportTime = new Date().toLocaleTimeString(isEn ? 'en-US' : 'id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const docId = `KTR-${new Date().getFullYear()}-${(business.id || 'BIZ').replace(/\D/g, '').slice(-4) || '8821'}`;

    // =========================================================================
    // 1. HEADER DOKUMEN UTAMA (NAVY #0A1931 & BERRY FUCHSIA #BE123C #E01A8A)
    // =========================================================================
    // Latar Belakang Header Utama (Tinggi 36mm)
    doc.setFillColor(10, 25, 49); // Navy Dark #0A1931
    doc.rect(0, 0, 210, 36, 'F');

    // Pola Garis Dekoratif Atas
    doc.setFillColor(11, 28, 63); // Secondary Navy #0B1C3F
    doc.rect(0, 0, 210, 1.5, 'F');

    // Aksen Garis Modern di Bawah Header (Berry Pink #BE123C & Fuchsia Pink #E01A8A)
    doc.setFillColor(190, 18, 60); // Deep Berry Pink #BE123C
    doc.rect(0, 36, 130, 2, 'F');
    doc.setFillColor(224, 26, 138); // Fuchsia Pink #E01A8A
    doc.rect(130, 36, 80, 2, 'F');

    // Logo Resmi Kataya (Kotak Putih Presisi dengan Logo Kaligrafi)
    const logoSize = 12.5;
    const logoX = 14;
    const logoY = 6.2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, 'S');

    const katayaLogoData = (typeof window !== 'undefined' && window.KATAYA_LOGO_BASE64) ? window.KATAYA_LOGO_BASE64 : null;
    let logoDrawn = false;
    if (katayaLogoData) {
        try {
            doc.addImage(katayaLogoData, 'JPEG', logoX + 0.8, logoY + 0.8, logoSize - 1.6, logoSize - 1.6);
            logoDrawn = true;
        } catch (e) {
            logoDrawn = false;
        }
    }
    if (!logoDrawn) {
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('K', logoX + 3.8, logoY + 8.8);
    }

    // Teks Brand Kataya
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('KATAYA SMART REVIEW FLOW', 30, 12.5);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(isEn ? 'AUTOMATED GOOGLE MAPS RATING PROTECTION, BARCODE & NFC SYSTEM' : 'SISTEM OTOMASI PROTEKSI RATING GOOGLE MAPS, BARCODE & KARTU PINTAR NFC', 30, 16.5);

    // Judul Besar Laporan
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(56, 189, 248); // Sky Blue 400
    doc.text(isEn ? 'OFFICIAL REPUTATION & REVIEW AUDIT REPORT' : 'LAPORAN RESMI AUDIT REPUTASI & KINERJA ULASAN BISNIS', 14, 25.5);

    // Metadata Waktu & No Dokumen
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text(isEn ? `Print Date: ${reportDate}, ${reportTime}   |   Report ID: ${docId}` : `Waktu Cetak: ${reportDate}, ${reportTime} WIB   |   ID Laporan: ${docId}`, 14, 30.5);

    // Badge Status Sertifikasi Resmi di Kanan Atas
    doc.setFillColor(24, 33, 56); // Darker Blue-Slate
    doc.setDrawColor(245, 158, 11); // Amber Border
    doc.setLineWidth(0.35);
    doc.roundedRect(138, 7, 58, 20.5, 2, 2, 'FD');

    // Garis Aksen Emas Vertikal di Badge
    doc.setFillColor(245, 158, 11);
    doc.rect(138, 7, 2.2, 20.5, 'F');

    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(isEn ? 'VERIFIED OFFICIAL AUDIT' : 'AUDIT RESMI TERVERIFIKASI', 143.5, 12);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text(isEn ? 'RATING PROTECTION ACTIVE' : 'PROTEKSI RATING AKTIF', 143.5, 17);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Google Maps Protected System', 143.5, 21.5);

    // =========================================================================
    // 2. KARTU PROFIL BISNIS & PLACE ID GOOGLE (DUA ZONA TERUKUR)
    // =========================================================================
    const profileY = 42;
    const profileH = 22;

    // Container Kartu Profil
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.35);
    doc.roundedRect(14, profileY, 182, profileH, 2, 2, 'FD');

    // Strip Aksen Biru di Kiri Kartu
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, profileY, 2.5, profileH, 1, 1, 'F');

    // ZONA KIRI: Identitas Bisnis (Lebar 122mm, terhindar dari tabrakan)
    const bizName = (business.businessName || 'BISNIS TANPA NAMA').toUpperCase();
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    // Wrap jika nama bisnis sangat panjang
    const bizNameLines = doc.splitTextToSize(bizName, 120);
    doc.text(bizNameLines[0], 20, profileY + 6.5);

    // Detail Paket & Cabang
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Paket: ${packageName}   •   Outlet: ${branchesCount} Cabang Aktif   •   ID: ${business.id}`, 20, profileY + 12);

    // Google Place ID
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Google Place ID:', 20, profileY + 17);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const placeIdRaw = business.placeId || 'Belum diatur';
    const placeIdDisplay = placeIdRaw.length > 40 ? placeIdRaw.slice(0, 38) + '...' : placeIdRaw;
    doc.text(placeIdDisplay, 43, profileY + 17);

    // ZONA KANAN: Kotak Badge Skor Google Maps (Lebar 52mm, X = 140)
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.setDrawColor(245, 158, 11);  // Amber 500
    doc.setLineWidth(0.3);
    doc.roundedRect(140, profileY + 3.5, 52, 15, 2, 2, 'FD');

    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('RATING GOOGLE MAPS', 144, profileY + 8);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.text(`${currentGoogleRating} / 5.0`, 144, profileY + 13);

    doc.setTextColor(4, 120, 87);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Terverifikasi Prima', 167, profileY + 13);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.text('Terintegrasi QR & Smart NFC', 144, profileY + 16.8);

    // =========================================================================
    // 3. KOTAK RINGKASAN METRIK (4 KPI BOXES - TATA LETAK LEGA & SEIMBANG)
    // =========================================================================
    const cardY = 67.5;
    const cardW = 43.5;
    const cardH = 22;
    const gap = 2.66;

    // Card 1: Total Interaksi
    const card1X = 14;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(card1X, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(isEn ? 'TOTAL REVIEWS' : 'TOTAL INTERAKSI', card1X + 3.5, cardY + 5.5);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(String(totalReviews), card1X + 3.5, cardY + 13.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(isEn ? 'Barcode Scan & NFC Tap' : 'Scan Barcode & Tap NFC Meja', card1X + 3.5, cardY + 18.5);

    // Card 2: Lolos ke Google Review (Bintang 4-5)
    const card2X = card1X + cardW + gap;
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(110, 231, 183); // Emerald 300
    doc.roundedRect(card2X, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(isEn ? 'CHANNELED TO GOOGLE' : 'LOLOS KE GOOGLE', card2X + 3.5, cardY + 5.5);
    doc.setFontSize(14);
    doc.setTextColor(4, 120, 87);
    doc.text(String(googleReviews), card2X + 3.5, cardY + 13.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(5, 150, 105);
    doc.text(isEn ? 'Public 4-5 Stars on Maps' : 'Publik Bintang 4-5 di Maps', card2X + 3.5, cardY + 18.5);

    // Card 3: Tersaring ke WhatsApp (Bintang 1-3)
    const card3X = card2X + cardW + gap;
    doc.setFillColor(254, 242, 242); // Rose/Red 50
    doc.setDrawColor(252, 165, 165);  // Rose/Red 300
    doc.roundedRect(card3X, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text(isEn ? 'INTERCEPTED TO WA' : 'TERSARING KE WA', card3X + 3.5, cardY + 5.5);
    doc.setFontSize(14);
    doc.setTextColor(190, 18, 60); // Rose 700
    doc.text(String(waComplaints), card3X + 3.5, cardY + 13.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(225, 29, 72);
    doc.text(isEn ? '1-3 Stars Handled Privately' : 'Kritik/Keluhan 1-3 Dicegat', card3X + 3.5, cardY + 18.5);

    // Card 4: Skor Rating Google Maps
    const card4X = card3X + cardW + gap;
    doc.setFillColor(239, 246, 255); // Blue 50
    doc.setDrawColor(147, 197, 253); // Blue 300
    doc.roundedRect(card4X, cardY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(isEn ? 'GOOGLE MAPS SCORE' : 'RATING GOOGLE MAPS', card4X + 3.5, cardY + 5.5);
    doc.setFontSize(13);
    doc.setTextColor(30, 64, 175);
    doc.text(`${currentGoogleRating} / 5.0`, card4X + 3.5, cardY + 13.5);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(29, 78, 216);
    doc.text(isEn ? 'Protected Public Score' : 'Reputasi Publik Terjaga', card4X + 3.5, cardY + 18.5);

    // =========================================================================
    // 4. RINGKASAN EKSEKUTIF EFEKTIVITAS SISTEM KATAYA
    // =========================================================================
    const summaryY = 93.5;

    // Judul Bagian Ringkasan Eksekutif
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isEn ? 'EXECUTIVE SUMMARY OF SYSTEM EFFECTIVENESS' : 'RINGKASAN EKSEKUTIF EFEKTIVITAS SISTEM KATAYA', 14, summaryY + 4);

    // Garis Bawah Halus Pembatas
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.line(14, summaryY + 6.5, 196, summaryY + 6.5);

    // Kalkulasi Persentase
    const percentGoogle = totalReviews > 0 ? Math.round((googleReviews / totalReviews) * 100) : 100;
    const percentWa = totalReviews > 0 ? (100 - percentGoogle) : 0;

    // BILAH GRAFIS DISTRIBUSI (PROGRESS BAR SEIMBANG)
    const barX = 14;
    const barY = summaryY + 9.5;
    const barW = 182;
    const barH = 5;

    // Background Bar Lembut
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');

    const googleBarW = totalReviews > 0 ? (barW * (percentGoogle / 100)) : barW;
    const waBarW = barW - googleBarW;

    // Bagian Hijau (Lolos Google)
    if (googleBarW > 0) {
        doc.setFillColor(16, 185, 129); // Emerald 500
        doc.roundedRect(barX, barY, googleBarW, barH, 1, 1, 'F');
    }

    // Bagian Merah (Tersaring WA)
    if (waBarW > 0) {
        doc.setFillColor(239, 68, 68); // Red 500
        doc.roundedRect(barX + googleBarW, barY, waBarW, barH, 1, 1, 'F');
    }

    // Teks Legend Keterangan di Bawah Bar
    const legendY = barY + barH + 4;

    // Legend Hijau: Lolos ke Google
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(14, legendY - 2.5, 3, 3, 0.5, 0.5, 'F');
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text(isEn ? `Channeled to Google: ${percentGoogle}%` : `Lolos ke Google Maps: ${percentGoogle}%`, 19, legendY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(isEn ? `(${googleReviews} positive 4-5★ reviews)` : `(${googleReviews} ulasan kepuasan bintang 4-5 publik)`, 56, legendY);

    // Legend Merah: Tersaring ke WhatsApp
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(115, legendY - 2.5, 3, 3, 0.5, 0.5, 'F');
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(isEn ? `Intercepted to WA: ${percentWa}%` : `Tersaring ke WhatsApp: ${percentWa}%`, 120, legendY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(isEn ? `(${waComplaints} critical 1-3★ feedback handled)` : `(${waComplaints} kritik/keluhan bintang 1-3 dicegat)`, 156, legendY);

    // TIGA BUTIR TEMUAN EKSEKUTIF
    // Item 1: Pencegahan Rating Negatif
    const item1Y = summaryY + 23.5;
    doc.setFillColor(239, 68, 68); // Red Bullet
    doc.circle(16.5, item1Y - 0.5, 1.2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isEn ? 'Negative Review Prevention (1-3 Stars):' : 'Pencegahan Rating Negatif (Bintang 1-3):', 20, item1Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const text1 = isEn 
        ? `A total of ${waComplaints} reviews rated 1-3 stars were intercepted directly to owner WhatsApp, safeguarding Google Maps score 100% from damaging reviews.`
        : `Sebanyak ${waComplaints} ulasan bernilai 1-3 bintang berhasil dicegat langsung ke WhatsApp pemilik sehingga rating Google Maps terlindungi 100% dari ulasan negatif.`;
    const text1Offset = isEn ? 73 : 68;
    doc.text(doc.splitTextToSize(text1, 138), text1Offset, item1Y);

    // Item 2: Penyaluran Reputasi Positif
    const item2Y = summaryY + 30.5;
    doc.setFillColor(37, 99, 235);
    doc.circle(16.5, item2Y - 0.5, 1.2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isEn ? 'Positive Reputation Routing:' : 'Penyaluran Reputasi Positif:', 20, item2Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const text2 = isEn
        ? `A total of ${googleReviews} satisfied guests (${percentGoogle}%) were guided to leave 4-5 stars on Google Maps to strengthen local SEO visibility.`
        : `Sebanyak ${googleReviews} pelanggan puas (${percentGoogle}%) langsung diarahkan memberikan bintang 4-5 di Google Maps bisnis untuk mendongkrak peringkat SEO lokal.`;
    const text2Offset = isEn ? 62 : 58;
    doc.text(doc.splitTextToSize(text2, 138), text2Offset, item2Y);

    // Item 3: Aksesibilitas Meja
    const item3Y = summaryY + 37.5;
    doc.setFillColor(245, 158, 11);
    doc.circle(16.5, item3Y - 0.5, 1.2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isEn ? 'Barcode & NFC Accessibility:' : 'Aksesibilitas Barcode & NFC:', 20, item3Y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const text3 = isEn
        ? 'Customers can instantly rate via table QR code scan or NFC smart stand tap without downloading any mobile application.'
        : 'Pelanggan dapat memberikan penilaian instan melalui scan QR barcode meja atau sentuhan kartu pintar NFC tanpa perlu memasang aplikasi tambahan.';
    const text3Offset = isEn ? 62 : 58;
    doc.text(doc.splitTextToSize(text3, 138), text3Offset, item3Y);

    // =========================================================================
    // 5. TABEL CATATAN RIWAYAT ULASAN (AKTIVITAS 1 BULAN TERAKHIR)
    // =========================================================================
    const tableHeaderY = 139;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(isEn ? 'AUDIT LOG OF REVIEWS (LAST 1 MONTH)' : 'LOG AKTIVITAS ULASAN & FILTER (1 BULAN TERAKHIR)', 14, tableHeaderY);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(isEn ? '(Displaying all review activity in the last 30 days)' : '(Menampilkan seluruh aktivitas ulasan selama 30 hari terakhir)', 118, tableHeaderY);

    // Filter ulasan: hanya aktivitas 1 bulan terakhir (30 hari)
    const cutoffDate = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const oneMonthReviews = reviews.filter(r => {
        if (!r.date) return false;
        const filterDate = new Date(r.date);
        return !isNaN(filterDate.getTime()) && filterDate >= cutoffDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    const tableRows = oneMonthReviews.map((r, idx) => {
        const d = new Date(r.date);
        const dateStr = !isNaN(d.getTime()) 
            ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
            : '-';
        
        let branchName = isEn ? 'Main Outlet' : 'Cabang Utama';
        if (business.branches && r.branchId) {
            const b = business.branches.find(br => br.id === r.branchId);
            if (b) branchName = b.name;
        }

        const filterStatus = isEn 
            ? (r.type === 'google' ? 'Channeled to Google Maps' : 'Intercepted to WhatsApp')
            : (r.type === 'google' ? 'Lolos ke Google Maps' : 'Dicegat ke WhatsApp');

        const ratingText = isEn ? `${r.stars || 5} Stars` : `Bintang ${r.stars || 5}`;

        let commentText = '-';
        if (r.comment && r.comment.trim()) {
            commentText = `"${r.comment.trim()}"`;
        } else if (r.type === 'google') {
            commentText = isEn ? 'Satisfied customer (no complaint)' : 'Pelanggan puas (tanpa keluhan)';
        } else {
            commentText = isEn ? 'Private feedback (no text)' : 'Keluhan WA (tanpa catatan teks)';
        }

        return [
            String(idx + 1),
            dateStr,
            branchName,
            ratingText,
            filterStatus,
            commentText
        ];
    });

    if (tableRows.length === 0) {
        tableRows.push(['-', '-', isEn ? 'No review activity recorded in the last 1 month (30 days).' : 'Tidak ada aktivitas ulasan dalam 1 bulan terakhir (30 hari).', '-', '-', '-']);
    }

    const tableHeaders = isEn 
        ? [['No', 'Date & Time', 'Branch Outlet', 'Rating', 'System Routing', 'Feedback / Complaint Notes']]
        : [['No', 'Waktu & Tanggal', 'Cabang Outlet', 'Penilaian', 'Penyaluran Sistem', 'Catatan / Keluhan Masuk']];

    const tableOptions = {
        startY: tableHeaderY + 3,
        head: tableHeaders,
        body: tableRows,
        theme: 'plain',
        showHead: 'everyPage',
        headStyles: {
            fillColor: [11, 28, 63], // Secondary Dark Navy #0B1C3F
            textColor: [255, 255, 255],
            fontSize: 7.2,
            fontStyle: 'bold',
            halign: 'left',
            valign: 'middle',
            cellPadding: 2.6
        },
        bodyStyles: {
            fontSize: 6.8,
            textColor: [51, 65, 85],
            cellPadding: 2.2,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 26 },
            2: { cellWidth: 28 },
            3: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
            4: { cellWidth: 41, fontStyle: 'bold' },
            5: { cellWidth: 58 }
        },
        margin: { top: 25, bottom: 20, left: 14, right: 14 },
        didParseCell: function(data) {
            // Pewarnaan dinamis dan badge elegan pada tabel
            if (data.section === 'body') {
                const cellText = String(data.cell.raw || '');
                // Kolom Penilaian (Bintang 1-3 diberi blok merah tegas)
                if (data.column.index === 3) {
                    if (cellText.includes('4') || cellText.includes('5')) {
                        data.cell.styles.fillColor = [236, 253, 245]; // Blok hijau lembut (Emerald 50)
                        data.cell.styles.textColor = [4, 120, 87];   // Teks hijau tua
                        data.cell.styles.fontStyle = 'bold';
                    } else if (cellText.includes('1') || cellText.includes('2') || cellText.includes('3')) {
                        // PENILAIAN RATING BINTANG 1-3: BLOK MERAH
                        data.cell.styles.fillColor = [254, 226, 226]; // Blok merah (Red 100)
                        data.cell.styles.textColor = [185, 28, 28];   // Teks merah tua tebal
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
                // Kolom Penyaluran Sistem
                if (data.column.index === 4) {
                    if (cellText.includes('Google Maps')) {
                        data.cell.styles.textColor = [4, 120, 87];
                        data.cell.styles.fillColor = [236, 253, 245]; // Blok hijau lembut
                        data.cell.styles.fontStyle = 'bold';
                    } else if (cellText.includes('WhatsApp')) {
                        data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fillColor = [254, 242, 242]; // Blok merah lembut
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
                // Kolom Catatan / Keluhan Masuk
                if (data.column.index === 5) {
                    if (cellText.includes('Pelanggan puas') || cellText.includes('Satisfied customer')) {
                        data.cell.styles.textColor = [148, 163, 184]; // Slate 400
                        data.cell.styles.fontStyle = 'italic';
                    }
                }
            }
        },
        didDrawPage: function(data) {
            // Header Mini jika tabel berlanjut ke Halaman 2 dan seterusnya
            if (data.pageNumber > 1) {
                doc.setFillColor(10, 25, 49); // Primary Navy #0A1931
                doc.rect(14, 8, 182, 11, 'F');

                // Mini Logo Resmi Kataya
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(16, 9, 9, 9, 1.5, 1.5, 'F');
                if (typeof window !== 'undefined' && window.KATAYA_LOGO_BASE64) {
                    try {
                        doc.addImage(window.KATAYA_LOGO_BASE64, 'JPEG', 16.5, 9.5, 8, 8);
                    } catch (e) {}
                }

                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.8);
                const miniHeader = isEn 
                    ? 'KATAYA SMART REVIEW FLOW - REPUTATION AUDIT LOG (Continued)' 
                    : 'KATAYA SMART REVIEW FLOW - LOG AUDIT REPUTASI (Lanjutan)';
                doc.text(miniHeader, 28, 15);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.8);
                doc.setTextColor(203, 213, 225);
                doc.text(business.businessName.toUpperCase(), 145, 15);
            }
        }
    };

    if (typeof doc.autoTable === 'function') {
        doc.autoTable(tableOptions);
    } else if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.autoTable === 'function') {
        window.jspdf.autoTable(doc, tableOptions);
    } else if (typeof window.autoTable === 'function') {
        window.autoTable(doc, tableOptions);
    }

    // =========================================================================
    // 6. FOOTER RESMI PADA SETIAP HALAMAN
    // =========================================================================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Garis Pembatas Halus Footer
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        doc.line(14, 283.5, 196, 283.5);

        // Info Dokumen Kiri
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        const docInfoLeft = isEn 
            ? `Kataya Smart Review Flow   •   Official Reputation Audit Report   •   Doc ID: ${docId}`
            : `Kataya Smart Review Flow   •   Laporan Resmi Audit Reputasi   •   No. Dokumen: ${docId}`;
        doc.text(docInfoLeft, 14, 287.8);

        // Penomoran Halaman Kanan
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        const pageText = isEn ? `Page ${i} of ${pageCount}` : `Halaman ${i} dari ${pageCount}`;
        doc.text(pageText, 174, 287.8);

        // Disclaimer Hukum & Hak Cipta Halus
        doc.setFontSize(5.2);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(160, 174, 192);
        const legalDisclaimer = isEn
            ? 'Disclaimer: Google & Google Maps are trademarks of Google LLC. Kataya Smart Review Flow is an independent system and not affiliated with Google LLC. Copyright (c) 2026 Kataya.'
            : 'Penafian: Google & Google Maps adalah merek dagang Google LLC. Kataya Smart Review Flow adalah sistem independen dan tidak terafiliasi resmi dengan Google LLC. Hak Cipta (c) 2026 Kataya.';
        doc.text(legalDisclaimer, 14, 292);
    }

    // Unduh berkas PDF ke perangkat pengguna
    const cleanBizName = (business.businessName || 'Bisnis').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filePrefix = isEn ? 'Report_Kataya' : 'Laporan_Kataya';
    const filename = `${filePrefix}_${cleanBizName}_${dateStamp}.pdf`;

    doc.save(filename);
}

window.generatePdfReport = generatePdfReport;
