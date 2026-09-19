/**
 * Kataya Smart Review Flow - Modul Dwibahasa (i18n)
 * Mendukung Bahasa Indonesia (id) 🇮🇩 dan English (en) 🇬🇧
 * Reaktif, instan tanpa reload, dan tersinkronisasi antar-halaman melalui localStorage
 */

(function (window) {
    'use strict';

    const STORAGE_KEY = 'kataya_language';
    const DEFAULT_LANG = 'id';

    const translations = {
        id: {
            // Navigasi & Umum
            nav: {
                home: 'Beranda',
                about: 'Tentang Kami',
                backHome: 'Kembali ke Beranda',
                orderService: 'Pesan Layanan Ini',
                dashboardPortal: 'Portal Pemilik Bisnis',
                devPortal: 'Portal Pengembang',
                contactUs: 'Hubungi Kami',
                poweredBy: 'Didukung oleh',
                rightsReserved: 'Seluruh Hak Cipta Dilindungi Undang-Undang.',
                disclaimer: 'Pernyataan Hukum & Fair Use: Google, Google Maps™, Google Places™, dan Google Reviews™ adalah merek dagang atau merek dagang terdaftar dari Google LLC di Amerika Serikat dan/atau negara lainnya. Kataya Smart Review Flow beroperasi secara independen dan tidak terafiliasi resmi dengan Google LLC.'
            },

            // Halaman Ulasan Pelanggan (review.html)
            review: {
                loadingBiz: 'Memuat Bisnis...',
                notRegisteredTitle: 'Bisnis Belum Terdaftar',
                notRegisteredDesc: 'Silakan lakukan pendaftaran bisnis terlebih dahulu di halaman utama.',
                officialOutlet: 'Outlet Resmi',
                rateInvite: 'Silakan berikan penilaian pengalaman Anda',
                verifiedGoogle: 'ulasan di Google Maps',
                selectStarsHint: 'Pilih 1 sampai 5 bintang',
                stars: {
                    1: '1 Bintang: Sangat Kurang Puas',
                    2: '2 Bintang: Kurang Memuaskan',
                    3: '3 Bintang: Cukup Baik / Rata-rata',
                    4: '4 Bintang: Puas & Menyenangkan',
                    5: '5 Bintang: Luar Biasa Istimewa!'
                },
                protectionBadge: 'Diproteksi oleh Sistem Verifikasi Ulasan Kataya',
                poweredFooter: 'Powered by Kataya Review Protection',
                
                // Modal Bintang 1-3 (Keluhan Masuk ke WhatsApp Owner)
                modalWaTitle: 'Mohon Maaf Atas Ketidaknyamanan Anda',
                modalWaDesc: 'Kami sangat menghargai setiap masukan Anda. Beritahu kami kendala Anda agar manajemen kami dapat langsung menindaklanjutinya!',
                complaintLabel: 'Ceritakan apa yang perlu kami perbaiki: (Opsional)',
                complaintPlaceholder: 'Contoh: Pelayanan agak lama, pesanan dingin, rasa kurang pas, dll.',
                complaintDirectWaHint: 'Masukan Anda akan diteruskan langsung ke nomor WhatsApp pribadi manajemen secara privat (bukan publik) demi perbaikan layanan kami.',
                btnCancel: 'Batal',
                btnSendWa: 'Kirim Masukan ke WhatsApp Manajemen',

                // Modal Bintang 4-5 (Apresiasi Masuk ke Google Review)
                modalGoogleTitle: 'Terima Kasih Atas Apresiasi Anda!',
                modalGoogleDesc: 'Dukungan positif Anda sangat berarti bagi perkembangan bisnis kami. Mohon bantu bagikan ulasan bintang',
                modalGoogleDesc2: 'Anda ke profil resmi Google Maps kami!',
                btnLater: 'Nanti Saja',
                btnGoGoogle: 'Lanjut Tulis Ulasan di Google Maps',
                autoRedirectText: 'Otomatis membuka Google Maps dalam',
                secondsText: 'detik...',
                
                // Pesan Sukses
                successWaTitle: 'Masukan Berhasil Disampaikan!',
                successWaDesc: 'Terima kasih telah membantu kami menjadi lebih baik. Pesan Anda sedang kami teruskan ke WhatsApp manajemen.',
                btnDone: 'Selesai',

                // Akun Terkunci / Pending
                lockedTitle: 'Akses Ulasan Terkunci Sementara',
                lockedDesc: 'Halaman ulasan untuk bisnis ini sedang dalam proses verifikasi dan aktivasi oleh tim Kataya.',
                lockedBtnDev: 'Hubungi Tim Kataya untuk Buka Kunci'
            },

            // Halaman Beranda (index.html)
            home: {
                heroBadge: 'Sistem Proteksi Reputasi Google Maps #1',
                heroTitle1: 'Lindungi Rating Google Bisnis Anda dari',
                heroTitleHighlight: 'Ulasan Bintang Buruk',
                heroSubtitle: 'Sistem pintar Kataya otomatis menyaring ulasan bintang 1-3 langsung ke WhatsApp pribadi Anda, dan hanya mengarahkan bintang 4-5 ke Google Maps publik bisnis Anda.',
                btnRegisterNow: 'Daftarkan Bisnis Anda Sekarang',
                btnTryDemo: 'Coba Demo Ulasan',
                badgeNfcIncluded: 'Termasuk Kartu Pintar NFC Meja Kasir',
                
                // Filter Showcase
                filterBadge: 'Bagaimana Cara Kerjanya?',
                filterTitle: 'Penyaringan Cerdas Otomatis Tanpa Ribet',
                filterDesc: 'Pelanggan cukup tap kartu NFC meja atau scan QR code ulasan.',
                cardLowTitle: 'Jika Pelanggan Pilih Bintang 1, 2, atau 3',
                cardLowBadge: 'Keluhan Dicegat & Dirahasiakan',
                cardLowDesc: 'Otomatis dialihkan ke WhatsApp pribadi pemilik bisnis. Rating Google Maps Anda tetap aman dan Anda bisa segera memperbaiki komplain pelanggan.',
                cardHighTitle: 'Jika Pelanggan Pilih Bintang 4 atau 5',
                cardHighBadge: 'Ulasan Positif Publik',
                cardHighDesc: 'Otomatis dialihkan ke Google Review resmi bisnis Anda, meningkatkan skor reputasi dan mendongkrak peringkat pencarian tempat.',
                
                // Form Registrasi
                formTitle: 'Formulir Pendaftaran Bisnis Baru',
                formSubtitle: 'Isi data bisnis Anda untuk mengaktifkan sistem smart review flow.',
                inputBizName: 'Nama Bisnis / Brand',
                inputBizNamePh: 'Contoh: Kopi Senja Utama',
                inputOwnerName: 'Nama Pemilik Bisnis',
                inputOwnerNamePh: 'Contoh: Budi Santoso',
                inputWa: 'Nomor WhatsApp Pemilik (Untuk Terima Keluhan Bintang 1-3)',
                inputWaPh: 'Contoh: 081234567890',
                inputPackage: 'Pilih Paket Layanan',
                packageSingle: 'Single Outlet - Rp 50.000 (1 Cabang)',
                packageMulti: 'Multi Cabang - Rp 100.000 (Maks 3 Cabang)',
                packageFranchise: 'Limit Franchise - Rp 500.000 (Tanpa Batas Cabang)',
                inputPlaceId: 'Google Maps Place ID Bisnis Anda',
                inputPlaceIdPh: 'Contoh: ChIJN1t_tDeuEmsRUsoyG83frY4',
                btnFindPlaceId: 'Panduan Cara Cari Place ID Bergambar',
                inputPin: 'Buat PIN Rahasia Dashboard (4-6 Digit Angka)',
                inputPinPh: 'Contoh: 123456',
                inputPinHint: 'PIN ini digunakan untuk masuk ke Dashboard Pemilik dan mengunduh laporan PDF.',
                btnSubmitRegister: 'Daftar & Lanjut ke Pembayaran',
                
                // Modal Pembayaran
                modalPayTitle: 'Selesaikan Pembayaran Aktivasi',
                modalPayDesc: 'Transfer biaya aktivasi 1x seumur hidup ke salah satu rekening resmi Kataya berikut:',
                btnConfirmPaid: 'Saya Sudah Transfer, Minta Aktivasi via WhatsApp',
                
                // Pricing Cards
                pricingTitle: 'Pilihan Paket Investasi Sekali Bayar',
                pricingSubtitle: 'Tanpa biaya bulanan atau langganan tersembunyi. Aktif seumur hidup.',
                btnChoosePackage: 'Pilih Paket Ini'
            },

            // Halaman Tentang Kami (about.html)
            about: {
                heroBadge: 'Solusi Proteksi Reputasi Digital #1',
                heroTitle: 'Mengapa Bisnis Modern Wajib Menggunakan Kataya?',
                heroSubtitle: 'Satu ulasan bintang 1 di Google Maps dapat menurunkan omset hingga 30%. Kataya hadir sebagai perisai digital reputasi bisnis Anda.',
                carouselHeader: 'Keunggulan Proteksi Kataya Flow',
                swipeHint: 'Geser kartu ke kiri atau ke kanan untuk melihat keunggulan lainnya',
                
                // 6 Kartu Komidi Putar
                cards: {
                    1: {
                        tag: 'Proteksi Reputasi',
                        title: 'Filter Cerdas Bintang 1-3',
                        desc: 'Keluhan pelanggan yang kecewa dicegat otomatis masuk ke WhatsApp pribadi manajemen. Masalah diselesaikan sebelum menjadi ulasan negatif permanen di Google Maps.'
                    },
                    2: {
                        tag: 'Teknologi Cepat',
                        title: 'Kartu Pintar NFC Meja Kasir',
                        desc: 'Pelanggan cukup menempelkan smartphone mereka ke kartu pintar NFC meja kasir. Tanpa unduh aplikasi, halaman ulasan langsung terbuka dalam 1 detik.'
                    },
                    3: {
                        tag: 'Kompatibilitas Luas',
                        title: 'Universal Barcode & QR Code',
                        desc: 'Dapat dicetak di struk kasir, tenda meja, atau banner dinding. Semua smartphone berkamera dapat memindai dengan sangat cepat.'
                    },
                    4: {
                        tag: 'Pertumbuhan Bisnis',
                        title: 'Pengungkit Bintang 4-5 Google',
                        desc: 'Pelanggan yang puas langsung diarahkan memberikan ulasan bintang 5 di Google Review resmi, meningkatkan posisi bisnis Anda di Google Search & Maps.'
                    },
                    5: {
                        tag: 'Dokumen Korporat',
                        title: 'Unduh Laporan Analitik PDF',
                        desc: 'Cetak laporan audit reputasi resmi format A4 berstandar eksekutif lengkap dengan logo resmi Kataya, diagram tren kepuasan, dan rincian ulasan.'
                    },
                    6: {
                        tag: 'Investasi Hemat',
                        title: 'Lisensi Sekali Bayar (Lifetime)',
                        desc: 'Mulai dari Rp 50.000 sekali bayar tanpa biaya bulanan atau komisi tersembunyi. Sistem terus aktif melindungi reputasi usaha Anda selamanya.'
                    }
                },

                // Paket Harga
                plansTitle: 'Pilihan Paket Investasi Bisnis',
                plansSubtitle: 'Pilih lisensi yang sesuai dengan skala bisnis dan jumlah gerai usaha Anda.',
                singlePlan: 'Single Outlet',
                multiPlan: 'Multi Cabang',
                franchisePlan: 'Limit Franchise',
                btnOrderSingle: 'Pesan Single (Rp 50rb)',
                btnOrderMulti: 'Pesan Multi (Rp 100rb)',
                btnOrderFranchise: 'Pesan Franchise (Rp 500rb)'
            },

            // Dashboard Pemilik (dashboard.html)
            dash: {
                portalTitle: 'Dashboard Pemilik Bisnis',
                portalSubtitle: 'Pusat kendali reputasi, analitik ulasan, dan pengaturan sistem proteksi',
                btnLogout: 'Keluar',
                btnContactCs: 'Bantuan CS',
                btnTestReview: 'Buka Halaman Ulasan',
                btnDownloadPdf: 'Download Laporan .PDF',
                btnDownloadDataPdf: 'Download Data .PDF',
                
                // Banner & Statistik
                statTotal: 'Total Feedback',
                statTotalSub: 'Semua interaksi pelanggan',
                statGoogle: 'Rating Google',
                statGoogleSub: 'Ulasan 4-5★ publik lolos',
                statWa: 'Tersaring ke WA',
                statWaSub: 'Bintang 1-3 dicegah dari publik',
                statScore: 'Skor Kepuasan',
                statScoreSub: 'Rating Google terlindungi',
                bannerActiveTitle: 'Sistem Filter Kataya Berjalan Aktif',
                bannerActiveDesc: 'Seluruh ulasan bintang 1-3 secara otomatis dialihkan ke WhatsApp pribadi Anda, menjaga skor Google Maps tetap tinggi!',

                // Tabs Navigasi
                tabAnalytics: 'Grafik & Aktivitas',
                tabQr: 'Barcode & Kartu NFC',
                tabBranches: 'Lokasi & Cabang',
                tabAppearance: 'Edit Tampilan Rating',
                tabSecurity: 'Keamanan & Ganti PIN',
                tabUpgrade: 'Upgrade Paket',

                // Charts & Aktivitas
                chartTrendTitle: 'Tren Ulasan & Perlindungan Rating',
                chartTrendSub: 'Perbandingan ulasan masuk harian',
                chartTrendRange: '7 Hari Terakhir',
                chartFilterTitle: 'Efektivitas Filter Cerdas',
                chartFilterSub: 'Penyaluran ulasan Google vs WA',
                labelGooglePassed: 'Lolos ke Google (4-5★)',
                labelWaFiltered: 'Tersaring ke WhatsApp (1-3★)',
                menuTitle: 'Menu Dashboard',
                recentReviewsTitle: 'Aktivitas Ulasan Terbaru',
                recentReviewsBadge: '1 Bulan Terakhir',
                recentReviewsSub: 'Riwayat ulasan masuk dari semua cabang Anda dalam 30 hari terakhir',
                thTime: 'Waktu',
                thBranch: 'Cabang',
                thStars: 'Bintang',
                thFilter: 'Status Filter',
                thComment: 'Catatan / Komentar',
                emptyReviews: 'Belum ada data ulasan dalam 1 bulan terakhir.',

                // Modal Login
                loginTitle: 'Masuk ke Dashboard Bisnis',
                loginDesc: 'Masukkan nomor WhatsApp terdaftar dan PIN rahasia Anda untuk membuka dashboard.',
                inputPhone: 'Nomor WhatsApp Terdaftar',
                inputPin: 'PIN Rahasia Bisnis',
                btnLogin: 'Buka Dashboard',
                btnForgotPin: 'Lupa PIN Rahasia?'
            },

            // Laporan PDF
            pdf: {
                brandSubtitle: 'SISTEM OTOMASI PROTEKSI RATING GOOGLE MAPS, BARCODE & KARTU PINTAR NFC',
                reportTitle: 'LAPORAN RESMI AUDIT REPUTASI & KINERJA ULASAN BISNIS',
                printTime: 'Waktu Cetak',
                docId: 'ID Dokumen',
                bizProfileTitle: 'PROFIL BISNIS & STATUS PROTEKSI KATAYA',
                colBizName: 'Nama Usaha',
                colOwner: 'Pemilik',
                colPhone: 'WhatsApp Terdaftar',
                colPackage: 'Paket Lisensi',
                colGoogleScore: 'Skor Google Maps',
                colProtectionRate: 'Tingkat Proteksi',
                summaryTitle: 'RINGKASAN EKSEKUTIF EFEKTIVITAS SISTEM KATAYA',
                summaryDesc: 'Sistem Smart Review Flow berhasil mengarahkan {google} ulasan bintang 4-5 langsung ke profil publik Google Maps, serta berhasil menyaring dan mencegat {wa} keluhan bintang 1-3 masuk ke WhatsApp pribadi manajemen. Tanpa sistem ini, reputasi bisnis Anda berisiko terpapar ulasan buruk di mata publik.',
                tableHeaderTitle: 'LOG RINCIAN AUDIT ULASAN & KELUHAN PELANGGAN',
                thNo: 'NO',
                thDate: 'TANGGAL & WAKTU',
                thRating: 'RATING',
                thChannel: 'KANAL / STATUS',
                thBranch: 'CABANG',
                thNotes: 'CATATAN KELUHAN / STATUS APRESIASI',
                pageOf: 'Halaman {current} dari {total}',
                footerDisclaimer: 'Penafian: Google & Google Maps adalah merek dagang Google LLC. Kataya Smart Review Flow beroperasi secara independen dan tidak terafiliasi resmi dengan Google LLC.'
            }
        },

        en: {
            // Navigation & General
            nav: {
                home: 'Home',
                about: 'About Us',
                backHome: 'Back to Home',
                orderService: 'Order This Service',
                dashboardPortal: 'Business Owner Portal',
                devPortal: 'Developer Portal',
                contactUs: 'Contact Us',
                poweredBy: 'Powered by',
                rightsReserved: 'All Rights Reserved.',
                disclaimer: 'Legal & Fair Use Statement: Google, Google Maps™, Google Places™, and Google Reviews™ are registered trademarks of Google LLC in the United States and/or other countries. Kataya Smart Review Flow operates independently and is not officially affiliated with Google LLC.'
            },

            // Customer Review Page (review.html)
            review: {
                loadingBiz: 'Loading Business...',
                notRegisteredTitle: 'Business Not Registered',
                notRegisteredDesc: 'Please register your business on the homepage first.',
                officialOutlet: 'Official Outlet',
                rateInvite: 'Please rate your experience with us',
                verifiedGoogle: 'reviews on Google Maps',
                selectStarsHint: 'Select 1 to 5 stars',
                stars: {
                    1: '1 Star: Very Dissatisfied',
                    2: '2 Stars: Needs Improvement',
                    3: '3 Stars: Average / Decent',
                    4: '4 Stars: Satisfied & Great',
                    5: '5 Stars: Outstanding Experience!'
                },
                protectionBadge: 'Protected by Kataya Smart Review Flow',
                poweredFooter: 'Powered by Kataya Review Protection',

                // Modal 1-3 Stars (Private WhatsApp Feedback)
                modalWaTitle: 'We Apologize for Your Inconvenience',
                modalWaDesc: 'We genuinely appreciate your honest feedback. Please tell us what went wrong so our management can resolve it immediately!',
                complaintLabel: 'Tell us how we can improve: (Optional)',
                complaintPlaceholder: 'E.g., Slow service, cold food, atmosphere, etc.',
                complaintDirectWaHint: 'Your feedback will be sent directly to management via private WhatsApp (not publicly visible) for immediate service improvement.',
                btnCancel: 'Cancel',
                btnSendWa: 'Send Feedback to Management WhatsApp',

                // Modal 4-5 Stars (Google Review Public)
                modalGoogleTitle: 'Thank You for Your Appreciation!',
                modalGoogleDesc: 'Your support means the world to our team. Please help share your',
                modalGoogleDesc2: 'star rating on our official Google Maps page!',
                btnLater: 'Later',
                btnGoGoogle: 'Continue to Review on Google Maps',
                autoRedirectText: 'Opening Google Maps automatically in',
                secondsText: 'seconds...',

                // Success Message
                successWaTitle: 'Feedback Sent Successfully!',
                successWaDesc: 'Thank you for helping us improve. Your message is now forwarded to our management WhatsApp.',
                btnDone: 'Done',

                // Account Locked / Pending
                lockedTitle: 'Review Page Temporarily Locked',
                lockedDesc: 'This business review page is currently awaiting verification and activation by the Kataya team.',
                lockedBtnDev: 'Contact Kataya Team for Activation'
            },

            // Homepage (index.html)
            home: {
                heroBadge: '#1 Google Maps Reputation Protection System',
                heroTitle1: 'Protect Your Google Business Rating From',
                heroTitleHighlight: 'Damaging Bad Reviews',
                heroSubtitle: 'Kataya smart system automatically intercepts 1-3 star complaints directly to your private WhatsApp, and only guides 4-5 star positive feedback to your public Google Maps profile.',
                btnRegisterNow: 'Register Your Business Now',
                btnTryDemo: 'Try Customer Review Demo',
                badgeNfcIncluded: 'Includes Smart NFC Table Card',

                // Filter Showcase
                filterBadge: 'How Does It Work?',
                filterTitle: 'Seamless Smart Filtering in Real-Time',
                filterDesc: 'Customers simply tap the NFC table card or scan the review QR code.',
                cardLowTitle: 'If Customer Selects 1, 2, or 3 Stars',
                cardLowBadge: 'Intercepted & Confidential',
                cardLowDesc: 'Directly routed to the owner’s private WhatsApp. Your public Google Maps score remains pristine while you resolve the customer complaint immediately.',
                cardHighTitle: 'If Customer Selects 4 or 5 Stars',
                cardHighBadge: 'Public Positive Reviews',
                cardHighDesc: 'Automatically directed to your official Google Review page, boosting your public score, search ranking, and walk-in foot traffic.',

                // Registration Form
                formTitle: 'Register Your Business',
                formSubtitle: 'Fill in your details to activate your smart review flow system.',
                inputBizName: 'Business / Brand Name',
                inputBizNamePh: 'E.g., Sunset Cafe & Bakery',
                inputOwnerName: 'Owner Name',
                inputOwnerNamePh: 'E.g., John Doe',
                inputWa: 'Owner WhatsApp Number (Receives 1-3 Star Complaints)',
                inputWaPh: 'E.g., 081234567890 or +6281234567890',
                inputPackage: 'Select Plan',
                packageSingle: 'Single Outlet - Rp 50,000 (1 Branch)',
                packageMulti: 'Multi Branches - Rp 100,000 (Up to 3 Branches)',
                packageFranchise: 'Franchise Limit - Rp 500,000 (Unlimited Branches)',
                inputPlaceId: 'Google Maps Place ID of Your Business',
                inputPlaceIdPh: 'E.g., ChIJN1t_tDeuEmsRUsoyG83frY4',
                btnFindPlaceId: 'Illustrated Guide: How to Find Place ID',
                inputPin: 'Create Dashboard PIN (4-6 Digits)',
                inputPinPh: 'E.g., 123456',
                inputPinHint: 'This PIN is used to sign in to your Owner Dashboard and export PDF reports.',
                btnSubmitRegister: 'Register & Proceed to Payment',

                // Payment Modal
                modalPayTitle: 'Complete Activation Payment',
                modalPayDesc: 'Transfer the one-time lifetime activation fee to one of our official payment channels:',
                btnConfirmPaid: 'I Have Paid, Request Activation via WhatsApp',

                // Pricing Cards
                pricingTitle: 'Lifetime Investment Plans',
                pricingSubtitle: 'No monthly subscriptions or hidden commissions. Active for life.',
                btnChoosePackage: 'Choose This Plan'
            },

            // About Page (about.html)
            about: {
                heroBadge: '#1 Digital Reputation Protection Solution',
                heroTitle: 'Why Does Every Modern Business Need Kataya?',
                heroSubtitle: 'A single 1-star review on Google Maps can drop revenue by up to 30%. Kataya acts as your digital reputation shield.',
                carouselHeader: 'Kataya Flow Protection Strengths',
                swipeHint: 'Swipe left or right to explore all key features',

                // 6 Carousel Cards
                cards: {
                    1: {
                        tag: 'Reputation Shield',
                        title: 'Smart 1-3 Star Filtering',
                        desc: 'Disappointed customer complaints are intercepted directly into private management WhatsApp. Resolve issues before they turn into permanent bad Google reviews.'
                    },
                    2: {
                        tag: 'Instant Tech',
                        title: 'Smart NFC Cashier Stand',
                        desc: 'Customers simply tap their phone to the table stand. No app download needed, the review page pops up in 1 second.'
                    },
                    3: {
                        tag: 'Universal Support',
                        title: 'Universal Barcode & QR Code',
                        desc: 'Printable on cashier receipts, table tents, or posters. Compatible with every camera smartphone instantly.'
                    },
                    4: {
                        tag: 'Business Growth',
                        title: 'Google 4-5 Star Multiplier',
                        desc: 'Satisfied guests are smoothly guided to leave 5-star reviews on your official Google Maps, rocketing your local search rank.'
                    },
                    5: {
                        tag: 'Corporate Reports',
                        title: 'Export Executive PDF Reports',
                        desc: 'Download executive A4 audit reports complete with the official Kataya logo, rating satisfaction charts, and audit logs.'
                    },
                    6: {
                        tag: 'Cost Effective',
                        title: 'One-Time Lifetime License',
                        desc: 'Starting from Rp 50,000 one-time payment with zero recurring monthly fees. Continues protecting your business forever.'
                    }
                },

                // Plans
                plansTitle: 'Business Investment Plans',
                plansSubtitle: 'Choose the ideal license tailored for your business scale and outlet count.',
                singlePlan: 'Single Outlet',
                multiPlan: 'Multi Branches',
                franchisePlan: 'Franchise Limit',
                btnOrderSingle: 'Order Single (Rp 50k)',
                btnOrderMulti: 'Order Multi (Rp 100k)',
                btnOrderFranchise: 'Order Franchise (Rp 500k)'
            },

            // Dashboard Page (dashboard.html)
            dash: {
                portalTitle: 'Business Owner Dashboard',
                portalSubtitle: 'Reputation command center, review analytics, and protection flow settings',
                btnLogout: 'Sign Out',
                btnContactCs: 'Support CS',
                btnTestReview: 'Open Review Page',
                btnDownloadPdf: 'Download .PDF Report',
                btnDownloadDataPdf: 'Download Data .PDF',

                // Banner & Stats
                statTotal: 'Total Feedback',
                statTotalSub: 'All customer interactions',
                statGoogle: 'Google Reviews',
                statGoogleSub: '4-5★ public reviews passed',
                statWa: 'Filtered to WhatsApp',
                statWaSub: '1-3★ reviews kept private',
                statScore: 'Satisfaction Score',
                statScoreSub: 'Google rating protected',
                bannerActiveTitle: 'Kataya Smart Filter Active',
                bannerActiveDesc: 'All 1-3 star reviews are automatically routed to your private WhatsApp, safeguarding your public Google Maps rating!',

                // Navigation Tabs
                tabAnalytics: 'Charts & Activity',
                tabQr: 'Barcode & NFC Cards',
                tabBranches: 'Locations & Branches',
                tabAppearance: 'Rating Page Theme',
                tabSecurity: 'Security & Change PIN',
                tabUpgrade: 'Upgrade Plan',

                // Charts & Activity
                chartTrendTitle: 'Review Trends & Rating Protection',
                chartTrendSub: 'Daily incoming reviews comparison',
                chartTrendRange: 'Last 7 Days',
                chartFilterTitle: 'Smart Filter Efficiency',
                chartFilterSub: 'Review routing: Google vs WhatsApp',
                labelGooglePassed: 'Passed to Google (4-5★)',
                labelWaFiltered: 'Filtered to WhatsApp (1-3★)',
                menuTitle: 'Dashboard Menu',
                recentReviewsTitle: 'Recent Review Activity',
                recentReviewsBadge: 'Last 1 Month',
                recentReviewsSub: 'Incoming customer reviews from all your branches in the last 30 days',
                thTime: 'Time',
                thBranch: 'Branch',
                thStars: 'Rating',
                thFilter: 'Filter Routing',
                thComment: 'Notes / Comments',
                emptyReviews: 'No review activity recorded in the last 1 month (30 days).',

                // Login Modal
                loginTitle: 'Sign In to Owner Dashboard',
                loginDesc: 'Enter your registered WhatsApp number and secret PIN to open the dashboard.',
                inputPhone: 'Registered WhatsApp Number',
                inputPin: 'Secret Business PIN',
                btnLogin: 'Open Dashboard',
                btnForgotPin: 'Forgot Secret PIN?'
            },

            // PDF Report
            pdf: {
                brandSubtitle: 'AUTOMATED GOOGLE MAPS RATING PROTECTION, BARCODE & NFC SYSTEM',
                reportTitle: 'OFFICIAL REPUTATION & REVIEW AUDIT REPORT',
                printTime: 'Export Date',
                docId: 'Document ID',
                bizProfileTitle: 'BUSINESS PROFILE & PROTECTION STATUS',
                colBizName: 'Business Name',
                colOwner: 'Owner Name',
                colPhone: 'Registered WhatsApp',
                colPackage: 'License Plan',
                colGoogleScore: 'Google Maps Score',
                colProtectionRate: 'Protection Rate',
                summaryTitle: 'EXECUTIVE SUMMARY OF SYSTEM EFFECTIVENESS',
                summaryDesc: 'Kataya Smart Review Flow successfully channeled {google} 4-5 star positive reviews directly to your public Google Maps profile, and successfully intercepted {wa} 1-3 star complaints into private management WhatsApp. Without this system, your public reputation would be vulnerable to permanent damaging reviews.',
                tableHeaderTitle: 'AUDIT LOG OF CUSTOMER REVIEWS & FEEDBACK',
                thNo: 'NO',
                thDate: 'DATE & TIME',
                thRating: 'RATING',
                thChannel: 'CHANNEL / STATUS',
                thBranch: 'BRANCH',
                thNotes: 'FEEDBACK NOTES / APPRECIATION STATUS',
                pageOf: 'Page {current} of {total}',
                footerDisclaimer: 'Disclaimer: Google & Google Maps are trademarks of Google LLC. Kataya Smart Review Flow operates independently and is not affiliated with Google LLC.'
            }
        }
    };

    /**
     * Dapatkan bahasa yang aktif saat ini ('id' atau 'en')
     */
    function getCurrentLang() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'en' || saved === 'id') return saved;
        } catch (e) {}
        return DEFAULT_LANG;
    }

    /**
     * Ambil string terjemahan berdasarkan path dot notation, contoh: t('review.stars.5')
     */
    function t(path, fallback = '') {
        const lang = getCurrentLang();
        const keys = path.split('.');
        let val = translations[lang];

        for (let i = 0; i < keys.length; i++) {
            if (val && typeof val === 'object' && keys[i] in val) {
                val = val[keys[i]];
            } else {
                val = null;
                break;
            }
        }

        if (typeof val === 'string') return val;

        // Coba fallback ke bahasa default
        if (lang !== DEFAULT_LANG) {
            let fbVal = translations[DEFAULT_LANG];
            for (let i = 0; i < keys.length; i++) {
                if (fbVal && typeof fbVal === 'object' && keys[i] in fbVal) {
                    fbVal = fbVal[keys[i]];
                } else {
                    fbVal = null;
                    break;
                }
            }
            if (typeof fbVal === 'string') return fbVal;
        }

        return fallback || path;
    }

    /**
     * Ubah bahasa aktif dan terapkan ke antarmuka
     */
    function setLanguage(lang) {
        if (lang !== 'id' && lang !== 'en') return;
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {}

        document.documentElement.lang = lang;
        applyTranslations();
        updateSwitcherUI();

        // Pancarkan event reaktif untuk script lain
        try {
            const event = new CustomEvent('kataya:lang_changed', { detail: { lang: lang } });
            window.dispatchEvent(event);
        } catch (e) {}
    }

    /**
     * Cari semua elemen ber-atribut data-i18n dan data-i18n-placeholder lalu perbarui teksnya
     */
    function applyTranslations() {
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const text = t(key);
                if (text) {
                    el.textContent = text;
                }
            }
        });

        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) {
                const text = t(key);
                if (text) {
                    el.setAttribute('placeholder', text);
                }
            }
        });
    }

    /**
     * Perbarui status aktif pada tombol pengalih bahasa di layar
     */
    function updateSwitcherUI() {
        const cur = getCurrentLang();
        const switchers = document.querySelectorAll('.kataya-lang-switcher');
        switchers.forEach(sw => {
            const btnId = sw.querySelector('[data-lang="id"]');
            const btnEn = sw.querySelector('[data-lang="en"]');
            if (btnId && btnEn) {
                if (cur === 'id') {
                    btnId.className = 'lang-btn active px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-700 shadow-xs transition-all flex items-center gap-1';
                    btnEn.className = 'lang-btn px-1.5 py-0.5 rounded text-[11px] font-normal text-slate-400 hover:text-slate-600 transition-all flex items-center gap-1';
                } else {
                    btnEn.className = 'lang-btn active px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-700 shadow-xs transition-all flex items-center gap-1';
                    btnId.className = 'lang-btn px-1.5 py-0.5 rounded text-[11px] font-normal text-slate-400 hover:text-slate-600 transition-all flex items-center gap-1';
                }
            }
        });
    }

    /**
     * Buat markup HTML tombol pengalih bahasa yang minimalis, tidak mencolok, dan ramping
     */
    function getSwitcherHtml() {
        const cur = getCurrentLang();
        const isId = cur === 'id';
        return `
            <div class="kataya-lang-switcher inline-flex items-center p-0.5 bg-slate-100/80 border border-slate-200/80 rounded-lg" title="Pilih Bahasa / Select Language">
                <button type="button" data-lang="id" onclick="window.KatayaI18n.setLanguage('id')" 
                    class="lang-btn ${isId ? 'active px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-700 shadow-xs' : 'px-1.5 py-0.5 rounded text-[11px] font-normal text-slate-400 hover:text-slate-600'} transition-all flex items-center gap-1">
                    <span class="text-[10px]">🇮🇩</span>
                    <span>ID</span>
                </button>
                <button type="button" data-lang="en" onclick="window.KatayaI18n.setLanguage('en')" 
                    class="lang-btn ${!isId ? 'active px-2 py-0.5 rounded text-[11px] font-semibold bg-white text-slate-700 shadow-xs' : 'px-1.5 py-0.5 rounded text-[11px] font-normal text-slate-400 hover:text-slate-600'} transition-all flex items-center gap-1">
                    <span class="text-[10px]">🇬🇧</span>
                    <span>EN</span>
                </button>
            </div>
        `;
    }

    /**
     * Helper merender switcher ke kontainer tertentu jika dibutuhkan
     */
    function renderSwitcher(containerId) {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = getSwitcherHtml();
        }
    }

    // Inisialisasi otomatis saat DOM siap
    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.lang = getCurrentLang();
        applyTranslations();
        updateSwitcherUI();
    });

    // Ekspor API ke global object
    window.KatayaI18n = {
        translations: translations,
        getCurrentLang: getCurrentLang,
        t: t,
        setLanguage: setLanguage,
        applyTranslations: applyTranslations,
        getSwitcherHtml: getSwitcherHtml,
        renderSwitcher: renderSwitcher
    };

})(window);