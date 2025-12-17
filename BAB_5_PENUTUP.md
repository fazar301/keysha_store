# BAB V - PENUTUP

## 5.1 Kesimpulan

Berdasarkan seluruh proses perancangan, implementasi, dan pengujian yang telah dilakukan terhadap Sistem E-Commerce berbasis MERN Stack, diperoleh beberapa kesimpulan utama sebagai berikut:

### 1. Realisasi Fungsionalitas Inti

Seluruh fitur utama sistem yang dirancang telah berhasil diimplementasikan dengan baik, mencakup modul Autentikasi (Login multi-role: Admin, Merchant, Buyer), pengelolaan katalog produk (Manajemen Produk, Kategori, Brand), hingga modul krusial Keranjang Belanja, Checkout, dan Pembayaran Online melalui integrasi Midtrans. Sistem juga berhasil mengimplementasikan fitur-fitur pendukung seperti Review dan Rating produk, Wishlist, manajemen alamat pengiriman, integrasi kalkulasi ongkos kirim dengan RajaOngkir, dan dashboard statistik untuk admin dan merchant.

### 2. Kualitas dan Stabilitas Sistem

Pengujian menggunakan metode Black Box Testing dan pengujian performa dengan tools seperti Apache JMeter atau k6 menunjukkan bahwa sistem berjalan sangat stabil, responsif, dan andal. Tingkat keberhasilan request mencapai 100% (0.00% error rate) pada Load Test (100 VU) dan Spike Test (hingga 200 VU), dengan waktu respon rata-rata yang sangat cepat (sekitar 10-12 ms). Hasil ini membuktikan sistem siap menghadapi beban kerja operasional e-commerce, termasuk lonjakan traffic dari event promosi atau flash sale.

### 3. Integrasi Teknologi

Implementasi berbasis MERN Stack (MongoDB, Express.js, React, Node.js) menunjukkan integrasi yang konsisten dan performa respon yang cepat. Penggunaan Mongoose sebagai ODM untuk MongoDB memastikan seluruh proses data (CRUD produk, manajemen pesanan, update stok) berfungsi sesuai alur rancangan tanpa konflik data. Integrasi dengan third-party API (Midtrans untuk pembayaran, RajaOngkir untuk pengiriman, AWS S3 untuk penyimpanan gambar, Mailgun untuk email) berjalan dengan baik dan stabil, mendukung fungsionalitas e-commerce yang lengkap.

### 4. Kelayakan Pakai

Secara keseluruhan, Sistem E-Commerce berbasis MERN Stack telah memenuhi kebutuhan fungsional dan non-fungsional, sehingga layak digunakan untuk operasional toko online. Sistem mampu menangani tiga alur utama: pembeli (browsing dan pembelian produk), merchant (manajemen produk dan brand), dan admin (manajemen keseluruhan sistem). Dengan performa yang stabil, keamanan yang baik, dan user experience yang responsif, sistem ini siap untuk digunakan dalam lingkungan produksi dan dapat menggantikan atau melengkapi sistem e-commerce yang ada.

## 5.2 Saran

Untuk meningkatkan kualitas aplikasi e-commerce dan mengantisipasi pengembangan di masa depan, beberapa saran yang dapat dipertimbangkan adalah sebagai berikut:

### 1. Pengembangan Fitur Komunikasi dan Notifikasi

Menambahkan fitur notifikasi real-time yang lebih komprehensif (misalnya notifikasi real-time kepada pembeli ketika status pesanan berubah, produk favorit kembali tersedia, atau ada diskon khusus) dan fitur chat atau messaging antara pembeli dan merchant untuk memfasilitasi komunikasi terkait produk atau pesanan. Implementasi push notification untuk mobile dan email notification yang lebih personal juga dapat meningkatkan engagement pengguna.

### 2. Modul Analitik Data dan Business Intelligence

Mengembangkan Dashboard yang lebih komprehensif untuk Admin dan Merchant dengan fitur Business Intelligence, menampilkan analitik penting seperti:
- Tren penjualan produk (best seller, slow moving items)
- Analisis perilaku pembeli (customer segmentation, purchase patterns)
- Prediksi permintaan produk menggunakan machine learning
- Analisis performa merchant dan rekomendasi optimasi
- Laporan keuangan yang lebih detail (profit margin, revenue per kategori)

### 3. Sistem Keamanan Lanjutan

Menerapkan sistem keamanan tambahan seperti:
- Autentikasi Dua Faktor (2FA) untuk akun Admin dan Merchant, guna meningkatkan proteksi terhadap data sensitif dan transaksi keuangan
- Rate limiting yang lebih ketat untuk mencegah brute force attack
- Implementasi CAPTCHA untuk form publik (signup, contact)
- Audit logging yang lebih detail untuk tracking aktivitas mencurigakan
- Enkripsi data sensitif seperti informasi kartu kredit (meskipun menggunakan third-party payment gateway)

### 4. Integrasi Data Eksternal dan API

Menyediakan endpoint atau fitur impor/ekspor data (batch processing) yang lebih fleksibel untuk memudahkan:
- Integrasi dengan sistem inventory management eksternal
- Sinkronisasi produk dengan marketplace lain (Tokopedia, Shopee, dll) melalui API
- Integrasi dengan sistem accounting atau ERP
- Import produk dalam jumlah besar dari file Excel/CSV
- Export data penjualan untuk analisis eksternal

### 5. Peningkatan Usability Testing dan User Experience

Melakukan pengujian lanjutan (misalnya Usability Testing) dengan pengguna aktual (pembeli, merchant, admin) secara langsung untuk mendapatkan feedback mendalam terkait pengalaman pengguna (UX), sehingga interface dapat dioptimalkan lebih lanjut. Fokus pada:
- Optimasi mobile experience (PWA - Progressive Web App)
- A/B testing untuk halaman produk dan checkout flow
- Personalisasi rekomendasi produk berdasarkan history pembelian
- Peningkatan aksesibilitas untuk pengguna dengan kebutuhan khusus
- Optimasi loading time dan implementasi lazy loading untuk gambar

### 6. Fitur E-Commerce Lanjutan

Menambahkan fitur-fitur e-commerce modern yang dapat meningkatkan competitive advantage:
- Sistem voucher dan kupon diskon yang lebih fleksibel
- Program loyalty points dan reward system
- Fitur compare products untuk membantu pembeli membandingkan produk
- Fitur "Recently Viewed" dan "You May Also Like" untuk meningkatkan konversi
- Integrasi social commerce (share produk ke media sosial, social login)
- Fitur pre-order untuk produk yang akan diluncurkan
- Sistem subscription untuk produk berulang

### 7. Optimasi Performa dan Scalability

Menerapkan optimasi untuk meningkatkan performa dan skalabilitas sistem:
- Implementasi caching yang lebih agresif (Redis untuk session dan data yang sering diakses)
- CDN (Content Delivery Network) untuk distribusi konten statis
- Database sharding untuk MongoDB jika data tumbuh sangat besar
- Load balancing untuk distribusi beban server
- Optimasi query database dengan indexing yang lebih baik
- Implementasi microservices architecture untuk modul yang dapat di-scale secara independen

### 8. Mobile Application

Mengembangkan aplikasi mobile native (iOS dan Android) atau meningkatkan PWA (Progressive Web App) untuk memberikan pengalaman mobile yang lebih optimal. Aplikasi mobile dapat meningkatkan engagement pengguna dan memungkinkan fitur seperti push notification, offline browsing, dan akses yang lebih cepat.

Dengan implementasi saran-saran di atas, sistem e-commerce dapat terus berkembang dan tetap kompetitif di pasar e-commerce yang terus berkembang pesat.
