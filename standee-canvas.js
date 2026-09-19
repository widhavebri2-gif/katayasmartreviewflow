/**
 * Kataya Smart Review Flow - Standee Canvas Generator
 * Menghasilkan kartu standee meja beresolusi tinggi siap cetak menggunakan latar belakang berry-pink dinamis
 */

(function(window) {
    function getBgUrl() {
        return (window.STANDEE_ASSETS && window.STANDEE_ASSETS.STANDEE_BG) || 'assets/img/standee-bg.jpg';
    }
    function getGoogleReviewsLogoUrl() {
        return (window.STANDEE_ASSETS && window.STANDEE_ASSETS.GOOGLE_REVIEWS_LOGO) || 'assets/img/google-reviews-logo.png';
    }
    function getNfcIconUrl() {
        return (window.STANDEE_ASSETS && window.STANDEE_ASSETS.NFC_ICON) || 'assets/img/nfc-icon.webp';
    }

    /**
     * Gambar rounded rectangle pada canvas 2D context
     */
    function drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Gambar Ikon NFC Contactless Waves (Universal Contactless Symbol)
     */
    function drawNfcIcon(ctx, centerX, centerY, size = 38, color = '#BE123C') {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3.5, size * 0.09);
        ctx.lineCap = 'round';

        // 4 gelombang contactless konsentris memancar ke kanan
        const originX = centerX - size * 0.42;
        const originY = centerY;
        const radii = [size * 0.28, size * 0.50, size * 0.72, size * 0.94];
        const startAngle = -Math.PI * 0.28;
        const endAngle = Math.PI * 0.28;

        radii.forEach(r => {
            ctx.beginPath();
            ctx.arc(originX, originY, r, startAngle, endAngle);
            ctx.stroke();
        });
        ctx.restore();
    }

    /**
     * Muat gambar dari URL menjadi Promise Image
     */
    function loadImage(url) {
        return new Promise((resolve) => {
            if (!url) return resolve(null);
            const img = new Image();
            // Hanya gunakan crossOrigin anonymous untuk URL eksternal http/https
            if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn('Gagal memuat gambar:', typeof url === 'string' ? url.substring(0, 60) : url);
                resolve(null);
            };
            img.src = url;
        });
    }

    /**
     * Vector SVG Logo Resmi Google "G" Multicolored
     */
    const GOOGLE_G_SVG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`);

    /**
     * Vector SVG Ilustrasi NFC Circular Badge
     * Sesuai referensi: badge bulat outline hitam, ponsel digenggam tangan di kanan,
     * 4 gelombang kontak di kiri, dan teks tebal "NFC" di bawah
     */
    const NFC_CIRCULAR_REF_SVG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <circle cx="100" cy="100" r="92" stroke="#202124" stroke-width="7" fill="#FFFFFF"/>
      <g fill="none" stroke="#202124" stroke-width="5" stroke-linecap="round">
        <path d="M 74,58 C 66,66 66,78 74,86"/>
        <path d="M 64,50 C 52,62 52,82 64,94"/>
        <path d="M 54,42 C 38,58 38,86 54,102"/>
        <path d="M 44,34 C 24,54 24,90 44,110"/>
      </g>
      <rect x="86" y="38" width="46" height="72" rx="9" stroke="#202124" stroke-width="5.5" fill="#FFFFFF"/>
      <line x1="102" y1="44" x2="116" y2="44" stroke="#202124" stroke-width="3" stroke-linecap="round"/>
      <rect x="93" y="50" width="32" height="46" rx="3" stroke="#202124" stroke-width="2.5" fill="#FFFFFF"/>
      <g fill="none" stroke="#202124" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 126,86 C 120,86 110,80 110,72 C 110,65 116,66 122,76 L 132,80"/>
        <path d="M 132,48 C 138,48 142,52 142,58 C 142,64 138,66 132,66"/>
        <path d="M 132,94 L 146,118 C 148,122 154,124 158,120 L 166,110 C 170,106 168,98 162,94 L 148,74"/>
        <rect x="140" y="120" width="34" height="14" rx="7" transform="rotate(-40 157 127)" stroke="#202124" stroke-width="5" fill="#FFFFFF"/>
      </g>
      <text x="100" y="152" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#202124" letter-spacing="1">NFC</text>
    </svg>`);

    /**
     * Render Standee Meja Lengkap ke Canvas dengan Penentuan Ukuran Satuan Centimeter (cm)
     * Desain persis foto referensi: Frame 4 Warna Google, Logo Google G di Kubah Bulat Atas, Google Review 5★,
     * tata letak SEJAJAR presisi (Kiri: NFC "TEMPELKAN HP KAMU", Tengah: Garis divider "ATAU", Kanan: QR "SCAN QR")
     * dan tetap menampilkan sentuhan khas Kataya (badge identitas & standee code)
     */
    async function renderStandeeToCanvas(canvas, options = {}) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // 1. Validasi & Kalkulasi Dimensi Centimeter ke Pixel (Standar 300 DPI Cetak = ~118.11 px/cm)
        const widthCm = Math.max(5, Math.min(100, parseFloat(options.widthCm) || 10));
        const heightCm = Math.max(5, Math.min(150, parseFloat(options.heightCm) || 15));
        const DPI_PX_PER_CM = 118.11;

        const width = Math.round(widthCm * DPI_PX_PER_CM);
        const height = Math.round(heightCm * DPI_PX_PER_CM);

        canvas.width = width;
        canvas.height = height;

        // Skala proporsional berbasis lebar/tinggi minimum terhadap acuan 10 cm (1181 px)
        const minDim = Math.min(width, height);
        const scale = minDim / 1181;
        const outerRadius = Math.max(20, Math.round(58 * scale));

        // 2. BINGKAI 4 WARNA RESMI GOOGLE (Biru, Merah, Hijau, Kuning)
        ctx.save();
        drawRoundedRect(ctx, 0, 0, width, height, outerRadius);
        ctx.clip();

        // Kuadran Kiri-Atas: Biru Google (#4285F4)
        ctx.fillStyle = '#4285F4';
        ctx.fillRect(0, 0, width / 2, height / 2);

        // Kuadran Kanan-Atas: Merah Google (#EA4335)
        ctx.fillStyle = '#EA4335';
        ctx.fillRect(width / 2, 0, width / 2, height / 2);

        // Kuadran Kiri-Bawah: Hijau Google (#34A853)
        ctx.fillStyle = '#34A853';
        ctx.fillRect(0, height / 2, width / 2, height / 2);

        // Kuadran Kanan-Bawah: Kuning Google (#FBBC05)
        ctx.fillStyle = '#FBBC05';
        ctx.fillRect(width / 2, height / 2, width / 2, height / 2);

        ctx.restore();

        // 3. KARTU PUTIH UTAMA DENGAN KUBAH BULAT DI TENGAH ATAS (PERSIS FOTO REFERENSI)
        const borderThickness = Math.max(16, Math.round(minDim * 0.056));
        const cardX = borderThickness;
        const cardY = borderThickness;
        const cardW = width - (borderThickness * 2);
        const cardH = height - (borderThickness * 2);
        const innerRadius = Math.max(14, Math.round(40 * scale));
        const centerX = width / 2;

        // Kubah bulat tempat Logo Google G melengkung ke atas
        const domeRadius = Math.round(88 * scale);
        const domeCenterY = cardY + Math.round(36 * scale);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = Math.round(18 * scale);
        ctx.fillStyle = '#FFFFFF';

        // Gabungkan Rounded Card + Kubah Bulat Atas
        ctx.beginPath();
        drawRoundedRect(ctx, cardX, cardY, cardW, cardH, innerRadius);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, domeCenterY, domeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Garis tepi putih halus
        ctx.save();
        ctx.strokeStyle = '#F1F3F4';
        ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
        ctx.beginPath();
        drawRoundedRect(ctx, cardX, cardY, cardW, cardH, innerRadius);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, domeCenterY, domeRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4. BAGIAN ATAS: LOGO GOOGLE "G", "Bantu Kami Dengan", "Google Review", & 5 BINTANG EMAS
        // A. Logo Google "G"
        const gLogoImg = await loadImage(GOOGLE_G_SVG);
        const gSize = Math.max(48, Math.round(112 * scale));
        const gX = centerX - (gSize / 2);
        const gY = domeCenterY - (gSize / 2);
        if (gLogoImg) {
            ctx.drawImage(gLogoImg, gX, gY, gSize, gSize);
        }

        // B. Teks Pengantar ("Bantu Kami Dengan")
        const promptText = options.subtitle || 'Bantu Kami Dengan';
        const promptFontSize = Math.max(12, Math.round(25 * scale));
        const promptY = domeCenterY + (gSize / 2) + Math.round(34 * scale);

        ctx.fillStyle = '#3C4043';
        ctx.font = `600 ${promptFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(promptText, centerX, promptY);

        // C & D. Logo Resmi Google Reviews dengan 5 Bintang (Persis Foto Referensi)
        const gReviewsImg = await loadImage(getGoogleReviewsLogoUrl());
        let starsY = promptY + Math.round(80 * scale);
        if (gReviewsImg) {
            const gRevMaxW = Math.min(cardW * 0.65, Math.round(380 * scale));
            const gRevW = gRevMaxW;
            const gRevH = Math.round(gRevW * (206 / 500));
            const gRevX = centerX - (gRevW / 2);
            const gRevY = promptY + Math.round(12 * scale);
            ctx.drawImage(gReviewsImg, gRevX, gRevY, gRevW, gRevH);
            starsY = gRevY + gRevH;
        } else {
            const titleFontSize = Math.max(20, Math.round(50 * scale));
            const titleY = promptY + Math.round(44 * scale);
            ctx.fillStyle = '#202124';
            ctx.font = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('Google Review', centerX, titleY);

            const starsFontSize = Math.max(14, Math.round(30 * scale));
            starsY = titleY + Math.round(32 * scale);
            ctx.fillStyle = '#FBBC05';
            ctx.font = `${starsFontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('★ ★ ★ ★ ★', centerX, starsY);
        }

        // Deteksi Orientasi Tata Letak Berdasarkan Dimensi Centimeter:
        // Jika lebih lebar (aspectRatio >= 0.90 / Square & Landscape): Tata Letak Kiri - Kanan
        // Jika lebih tinggi (aspectRatio < 0.90 / Portrait): Tata Letak Atas - Bawah
        const aspectRatio = width / height;
        const isVertical = options.layoutMode === 'vertical' || (options.layoutMode !== 'horizontal' && aspectRatio < 0.90);

        // 5. AREA KONTEN INTERAKTIF (QR CODE & NFC LOGO MENYESUAIKAN UKURAN SECARA DINAMIS)
        const footerReservedH = Math.round(100 * scale);
        const contentTop = starsY + Math.round(24 * scale);
        const contentBottom = cardY + cardH - footerReservedH;
        const availableHeight = contentBottom - contentTop;

        // Muat gambar QR Code dan NFC
        let qrImg = null;
        if (options.qrDataUrl) {
            qrImg = await loadImage(options.qrDataUrl);
        }
        let nfcImg = await loadImage(getNfcIconUrl());
        if (!nfcImg) {
            nfcImg = await loadImage(NFC_CIRCULAR_REF_SVG);
        }

        if (isVertical) {
            // =========================================================================
            // TAMPILAN LEBIH TINGGI (PORTRAIT): TATA LETAK ATAS - BAWAH
            // 1. ATAS: Kotak QR Code + Label "SCAN QR"
            // 2. TENGAH: Divider Garis Horizontal + "ATAU"
            // 3. BAWAH: Ilustrasi NFC + Label "TEMPELKAN HP KAMU"
            // (Posisi NFC: Kiri pada mode lebar, Bawah pada mode tinggi)
            // =========================================================================

            // Ukuran QR Code: membesar mengisi ruang kartu
            const qrSize = Math.round(Math.min(cardW * 0.54, availableHeight * 0.36));

            // Ukuran NFC: Lingkaran Bulat 1:1 (Square) sesuai referensi
            const nfcH = Math.round(Math.min(cardW * 0.44, availableHeight * 0.24));
            const nfcW = nfcH;

            const labelFontSize = Math.max(11, Math.round(20 * scale));
            const labelGap = Math.round(14 * scale);
            const dividerH = Math.max(16, Math.round(24 * scale));
            const atauFontSize = Math.max(10, Math.round(16 * scale));

            // Total tinggi seluruh elemen dalam konten
            const totalElementsH = qrSize + labelGap + labelFontSize + dividerH + nfcH + labelGap + labelFontSize;
            const remainingSpace = Math.max(0, availableHeight - totalElementsH);
            const gap = Math.round(remainingSpace / 4);

            // A. Posisi QR Code (Atas)
            const qrY = contentTop + gap;
            const qrX = centerX - (qrSize / 2);

            if (qrImg) {
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            } else {
                ctx.fillStyle = '#94A3B8';
                ctx.font = `bold ${Math.max(10, Math.round(18 * scale))}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('Memuat QR...', centerX, qrY + (qrSize / 2));
            }

            // Label QR
            const qrLabelY = qrY + qrSize + labelGap + labelFontSize;
            ctx.fillStyle = '#202124';
            ctx.font = `900 ${labelFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('SCAN QR', centerX, qrLabelY);

            // B. Divider Horizontal "ATAU" (Tengah)
            const dividerY = qrLabelY + gap + Math.round(dividerH / 2);
            const dividerHalfW = Math.min(cardW * 0.36, Math.round(180 * scale));
            const atauHalfGap = Math.round(28 * scale);

            ctx.strokeStyle = '#DADCE0';
            ctx.lineWidth = Math.max(1.5, Math.round(2.2 * scale));
            ctx.lineCap = 'round';

            // Garis pembatas kiri
            ctx.beginPath();
            ctx.moveTo(centerX - dividerHalfW, dividerY);
            ctx.lineTo(centerX - atauHalfGap, dividerY);
            ctx.stroke();

            // Teks "ATAU"
            ctx.fillStyle = '#5F6368';
            ctx.font = `700 ${atauFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ATAU', centerX, dividerY);
            ctx.textBaseline = 'alphabetic';

            // Garis pembatas kanan
            ctx.beginPath();
            ctx.moveTo(centerX + atauHalfGap, dividerY);
            ctx.lineTo(centerX + dividerHalfW, dividerY);
            ctx.stroke();

            // C. Posisi NFC (Bawah)
            const nfcY = dividerY + gap + Math.round(dividerH / 2);
            const nfcX = centerX - (nfcW / 2);

            if (nfcImg) {
                if (nfcImg.naturalHeight && nfcImg.naturalHeight > nfcImg.naturalWidth) {
                    const sDim = nfcImg.naturalWidth;
                    ctx.drawImage(nfcImg, 0, 0, sDim, sDim, nfcX, nfcY, nfcW, nfcH);
                } else {
                    ctx.drawImage(nfcImg, nfcX, nfcY, nfcW, nfcH);
                }
            }

            // Label NFC
            const nfcLabelY = nfcY + nfcH + labelGap + labelFontSize;
            ctx.fillStyle = '#202124';
            ctx.font = `900 ${labelFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('TEMPELKAN HP KAMU', centerX, nfcLabelY);

        } else {
            // =========================================================================
            // TAMPILAN LEBIH LEBAR (SQUARE / LANDSCAPE): TATA LETAK KIRI - KANAN
            // SISI KIRI: Ilustrasi NFC + "TEMPELKAN HP KAMU"
            // TENGAH: Divider Garis Vertikal + "ATAU"
            // SISI KANAN: Kotak QR Code + "SCAN QR"
            // Penskalaan dinamis mengisi lebar dan tinggi kolom secara simetris
            // =========================================================================

            const labelFontSize = Math.max(10, Math.round(18 * scale));
            const labelSpace = Math.round(42 * scale);

            // Batas tinggi maksimal box agar tidak menabrak label & footer
            const maxHByHeight = (availableHeight - labelSpace) * 0.88;
            // Batas lebar kolom kiri/kanan terhadap divider tengah (Keduanya 1:1 Square simetris!)
            const colWidth = (cardW - Math.round(70 * scale)) / 2;
            const maxHByWidth = colWidth * 0.86;

            const boxH = Math.round(Math.min(maxHByWidth, maxHByHeight));
            const midY = contentTop + (availableHeight / 2) - Math.round(10 * scale);

            const boxTop = midY - (boxH / 2);
            const boxBottom = boxTop + boxH;

            // Kolom Kiri & Kanan simetris sempurna terhadap centerX
            const halfDividerGap = Math.round(36 * scale);
            const leftZoneStart = cardX + Math.round(20 * scale);
            const leftZoneEnd = centerX - halfDividerGap;
            const leftColX = (leftZoneStart + leftZoneEnd) / 2;

            const rightZoneStart = centerX + halfDividerGap;
            const rightZoneEnd = cardX + cardW - Math.round(20 * scale);
            const rightColX = (rightZoneStart + rightZoneEnd) / 2;

            // A. SISI KIRI: ILUSTRASI NFC (Lingkaran Bulat 1:1 Square)
            const nfcH = boxH;
            const nfcW = boxH;
            const nfcX = leftColX - (nfcW / 2);
            const nfcY = boxTop;

            if (nfcImg) {
                if (nfcImg.naturalHeight && nfcImg.naturalHeight > nfcImg.naturalWidth) {
                    const sDim = nfcImg.naturalWidth;
                    ctx.drawImage(nfcImg, 0, 0, sDim, sDim, nfcX, nfcY, nfcW, nfcH);
                } else {
                    ctx.drawImage(nfcImg, nfcX, nfcY, nfcW, nfcH);
                }
            }

            // B. SISI KANAN: QR CODE
            const qrSize = boxH;
            const qrX = rightColX - (qrSize / 2);
            const qrY = boxTop;

            if (qrImg) {
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            } else {
                ctx.fillStyle = '#94A3B8';
                ctx.font = `bold ${Math.max(10, Math.round(18 * scale))}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('Memuat QR...', rightColX, qrY + (qrSize / 2));
            }

            // C. TENGAH: GARIS PEMBATAS VERTIKAL & "ATAU"
            const dividerTop = boxTop - Math.round(6 * scale);
            const dividerBottom = boxBottom + Math.round(6 * scale);
            const atauY = boxTop + (boxH / 2);
            const atauHalfGap = Math.round(20 * scale);
            const atauFontSize = Math.max(9, Math.round(16 * scale));

            ctx.strokeStyle = '#DADCE0';
            ctx.lineWidth = Math.max(1.5, Math.round(2 * scale));
            ctx.lineCap = 'round';

            // Garis atas
            ctx.beginPath();
            ctx.moveTo(centerX, dividerTop);
            ctx.lineTo(centerX, atauY - atauHalfGap);
            ctx.stroke();

            // Teks "ATAU"
            ctx.fillStyle = '#5F6368';
            ctx.font = `700 ${atauFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ATAU', centerX, atauY);
            ctx.textBaseline = 'alphabetic';

            // Garis bawah
            ctx.beginPath();
            ctx.moveTo(centerX, atauY + atauHalfGap);
            ctx.lineTo(centerX, dividerBottom);
            ctx.stroke();

            // D. LABEL BAWAH (SEJAJAR HORIZONTAL PADA BASELINE PERSIS)
            const labelY = boxBottom + Math.round(30 * scale);

            ctx.fillStyle = '#202124';
            ctx.font = `900 ${labelFontSize}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';

            // Label Kiri
            ctx.fillText('TEMPELKAN HP KAMU', leftColX, labelY);

            // Label Kanan
            ctx.fillText('SCAN QR', rightColX, labelY);
        }

        // 6. SENTUHAN KHAS KATAYA (IDENTITAS RESMI KATAYA REVIEW FLOW & KODE STANDEE)
        const standeeCode = options.standeeCode || '';
        const bizTitle = (options.title && options.title !== 'Google Reviews' && options.title !== 'Google Review') ? options.title : '';

        const footerCenterY = cardY + cardH - Math.round(36 * scale);

        // Nama Bisnis Mitra (Jika ada)
        if (bizTitle) {
            ctx.fillStyle = '#4B5563';
            ctx.font = `700 ${Math.max(10, Math.round(16 * scale))}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(bizTitle.toUpperCase(), centerX, footerCenterY - Math.round(22 * scale));
        }

        // Badge Khas Kataya Smart Review Flow dengan Berry-Pink Accent
        const badgeH = Math.max(22, Math.round(32 * scale));
        const badgeText = standeeCode ? `KATAYA SMART REVIEW FLOW  •  ${standeeCode}` : `KATAYA SMART REVIEW FLOW`;
        ctx.font = `800 ${Math.max(9, Math.round(13 * scale))}px system-ui, -apple-system, sans-serif`;
        const badgeTextW = ctx.measureText(badgeText).width;
        const badgeW = badgeTextW + Math.round(44 * scale);
        const badgeX = centerX - (badgeW / 2);
        const badgeY = footerCenterY - (badgeH / 2) + (bizTitle ? Math.round(6 * scale) : 0);
        const badgeRadius = Math.round(badgeH / 2);

        ctx.save();
        // Background kapsul Berry-Pink lembut
        ctx.fillStyle = '#FDF2F8';
        ctx.strokeStyle = '#F43F5E';
        ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
        drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeRadius);
        ctx.fill();
        ctx.stroke();

        // Dot Kataya Berry-Pink (#BE123C)
        const dotX = badgeX + Math.round(16 * scale);
        const dotY = badgeY + (badgeH / 2);
        ctx.fillStyle = '#BE123C';
        ctx.beginPath();
        ctx.arc(dotX, dotY, Math.round(4 * scale), 0, Math.PI * 2);
        ctx.fill();

        // Teks Badge Kataya
        ctx.fillStyle = '#9F1239';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, dotX + Math.round(10 * scale), dotY);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    /**
     * Download canvas sebagai file PNG tunggal
     */
    function downloadStandeeAsPng(canvas, filename = 'Standee-Meja-Kataya.png') {
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Download kumpulan barcode/standee (.PNG) secara massal langsung berurutan
     * @param {Array<{filename: string, dataUrl?: string, canvas?: HTMLCanvasElement}>} items
     * @param {Function} onProgress callback (current, total)
     */
    async function downloadMultiplePngsDirect(items = [], onProgress = null) {
        if (!Array.isArray(items) || items.length === 0) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const dataUrl = item.dataUrl || (item.canvas ? item.canvas.toDataURL('image/png') : null);
            if (dataUrl) {
                const link = document.createElement('a');
                link.download = item.filename || `Standee_${i + 1}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            if (typeof onProgress === 'function') {
                onProgress(i + 1, items.length);
            }
            // Delay halus antar-unduhan agar browser tidak memblokir multi-unduhan
            await new Promise(r => setTimeout(r, 220));
        }
    }

    /**
     * Download kumpulan barcode/standee (.PNG) dikemas dalam berkas .ZIP
     * Memanfaatkan JSZip jika tersedia, dengan fallback otomatis ke direct multi-download
     * @param {Array<{filename: string, dataUrl?: string, canvas?: HTMLCanvasElement}>} items
     * @param {string} zipFilename Nama berkas ZIP (contoh: 'Batch_Barcode_Standee.zip')
     * @param {Function} onProgress callback (percent, statusText)
     */
    async function downloadMultiplePngsAsZip(items = [], zipFilename = 'Batch_Barcode_Standee.zip', onProgress = null) {
        if (!Array.isArray(items) || items.length === 0) return;

        // Jika JSZip tidak tersedia, gunakan fallback direct multi-download
        if (typeof window.JSZip === 'undefined') {
            console.warn('JSZip belum dimuat. Menggunakan fallback pengunduhan berurutan langsung.');
            if (typeof onProgress === 'function') onProgress(50, 'Mengunduh berkas langsung...');
            await downloadMultiplePngsDirect(items, (cur, total) => {
                if (typeof onProgress === 'function') {
                    onProgress(Math.round((cur / total) * 100), `Mengunduh ${cur} dari ${total} file .PNG...`);
                }
            });
            return;
        }

        try {
            const zip = new window.JSZip();

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                let dataUrl = item.dataUrl || (item.canvas ? item.canvas.toDataURL('image/png') : null);
                if (dataUrl) {
                    // Ekstrak base64 string dari DataURL
                    const base64Data = dataUrl.split(',')[1] || dataUrl;
                    const cleanFilename = item.filename || `Standee_${i + 1}.png`;
                    zip.file(cleanFilename, base64Data, { base64: true });
                }
                if (typeof onProgress === 'function') {
                    const pct = Math.round(((i + 1) / items.length) * 50);
                    onProgress(pct, `Mengemas gambar ${i + 1} dari ${items.length}...`);
                }
            }

            if (typeof onProgress === 'function') {
                onProgress(60, 'Mengompresi berkas ZIP...');
            }

            const contentBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            }, (metadata) => {
                if (typeof onProgress === 'function') {
                    const totalPct = 50 + Math.round(metadata.percent * 0.5);
                    onProgress(totalPct, `Kompresi ZIP: ${Math.round(metadata.percent)}%`);
                }
            });

            // Picu download file ZIP
            if (typeof window.saveAs === 'function') {
                window.saveAs(contentBlob, zipFilename);
            } else {
                const url = URL.createObjectURL(contentBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = zipFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1500);
            }

            if (typeof onProgress === 'function') {
                onProgress(100, 'Pengunduhan ZIP berhasil!');
            }
        } catch (err) {
            console.error('Error membuat ZIP:', err);
            // Fallback ke direct multi download jika terjadi error
            await downloadMultiplePngsDirect(items, onProgress);
        }
    }

    window.KatayaStandee = {
        renderStandeeToCanvas,
        downloadStandeeAsPng,
        downloadMultiplePngsDirect,
        downloadMultiplePngsAsZip
    };

})(window);
