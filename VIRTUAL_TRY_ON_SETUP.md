# Virtual Try-On Setup Guide

Panduan untuk mengatur Virtual Try-On menggunakan Google Cloud Vertex AI.

## Prerequisites

1. **Google Cloud Account** dengan project yang aktif
2. **Google Cloud SDK (gcloud CLI)** terinstall
3. **Vertex AI API** diaktifkan di project Anda

## Setup Steps

### 1. Install Google Cloud SDK

Jika belum terinstall, download dan install dari: https://cloud.google.com/sdk/docs/install

### 2. Login ke Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Enable Vertex AI API

```bash
gcloud services enable aiplatform.googleapis.com
```

### 4. Set Environment Variables

Tambahkan variabel berikut ke file `.env` di folder `server/`:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
# Optional: Jika tidak menggunakan gcloud CLI, set access token langsung
# GOOGLE_CLOUD_ACCESS_TOKEN=your-access-token
# Optional: Cloud Storage bucket untuk menyimpan hasil
# GCS_OUTPUT_BUCKET=your-bucket-name
```

## Cara Mencari Project ID dan Region

### Mencari Project ID

#### Method 1: Melalui Google Cloud Console (Web)
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Di bagian atas halaman, lihat dropdown di sebelah "Google Cloud"
3. Project ID akan terlihat di dropdown tersebut (bukan Project Name)
4. Atau klik dropdown untuk melihat daftar semua project dan Project ID-nya

#### Method 2: Melalui gcloud CLI
```bash
# Lihat project yang sedang aktif
gcloud config get-value project

# Atau lihat semua project yang Anda miliki
gcloud projects list
```

#### Method 3: Melalui URL Browser
- Saat membuka Google Cloud Console, URL akan seperti:
  `https://console.cloud.google.com/home/dashboard?project=YOUR-PROJECT-ID`
- `YOUR-PROJECT-ID` adalah Project ID Anda

### Mencari Cloud Region

#### Method 1: Melalui Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Anda
3. Buka menu hamburger (☰) di kiri atas
4. Pilih "Vertex AI" > "Workbench" atau "Model Garden"
5. Region akan terlihat di dropdown di bagian atas halaman

#### Method 2: Melalui gcloud CLI
```bash
# Lihat region yang tersedia untuk Vertex AI
gcloud compute regions list

# Region yang umum digunakan untuk Vertex AI:
# - us-central1 (Iowa, USA)
# - us-east1 (South Carolina, USA)
# - us-west1 (Oregon, USA)
# - europe-west1 (Belgium)
# - asia-east1 (Taiwan)
# - asia-southeast1 (Singapore)
```

#### Method 3: Region yang Didukung Virtual Try-On
Berdasarkan dokumentasi Google Cloud, region yang didukung untuk Virtual Try-On API:
- `us-central1` (Iowa, USA) - **Recommended**
- `us-east1` (South Carolina, USA)
- `europe-west1` (Belgium)
- `asia-southeast1` (Singapore)

**Catatan**: Pastikan region yang Anda pilih mendukung Vertex AI API dan Virtual Try-On model.

### Contoh Setup

Jika Project ID Anda adalah `my-ecommerce-project-12345` dan ingin menggunakan region `us-central1`:

```env
GOOGLE_CLOUD_PROJECT_ID=my-ecommerce-project-12345
GOOGLE_CLOUD_REGION=us-central1
```

### Verifikasi Setup

Setelah mengatur environment variables, verifikasi dengan:

```bash
# Di terminal, masuk ke folder server
cd server

# Test apakah gcloud sudah terkonfigurasi
gcloud config get-value project

# Test apakah Vertex AI API sudah diaktifkan
gcloud services list --enabled | grep aiplatform
```

### 5. Authentication Options

#### Option A: Menggunakan gcloud CLI (Recommended)

**Langkah-langkah:**

1. **Install Google Cloud SDK** (jika belum):
   - Download dari: https://cloud.google.com/sdk/docs/install
   - Atau menggunakan package manager:
     ```bash
     # Windows (dengan Chocolatey)
     choco install gcloudsdk
     
     # macOS (dengan Homebrew)
     brew install --cask google-cloud-sdk
     
     # Linux
     curl https://sdk.cloud.google.com | bash
     ```

2. **Login ke Google Cloud**:
   ```bash
   gcloud auth login
   ```
   - Browser akan terbuka untuk login
   - Pilih akun Google Cloud Anda
   - Setujui permissions

3. **Set Project**:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

4. **Verifikasi**:
   ```bash
   gcloud auth list
   gcloud config get-value project
   ```

Backend akan otomatis menggunakan `gcloud auth print-access-token` untuk mendapatkan token.

#### Option B: Menggunakan Service Account (Recommended untuk Production)

**Langkah-langkah:**

1. **Buat Service Account**:
   - Buka [Google Cloud Console](https://console.cloud.google.com/)
   - Pilih project Anda
   - Buka menu "IAM & Admin" > "Service Accounts"
   - Klik "Create Service Account"
   - Isi nama dan deskripsi
   - Klik "Create and Continue"

2. **Berikan Role**:
   - Pilih role: "Vertex AI User" atau "AI Platform User"
   - Klik "Continue" > "Done"

3. **Buat Key**:
   - Klik service account yang baru dibuat
   - Buka tab "Keys"
   - Klik "Add Key" > "Create new key"
   - Pilih "JSON"
   - Download file JSON

4. **Set Environment Variable**:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=D:\path\to\service-account-key.json
   ```

5. **Update Backend Code** (jika perlu):
   - Backend perlu diupdate untuk menggunakan service account credentials
   - Atau gunakan library `google-auth-library`

#### Option C: Manual Access Token (Untuk Testing)

**Cara 1: Menggunakan gcloud CLI (Terminal)**
```bash
# Get access token
gcloud auth print-access-token

# Copy token yang dihasilkan
# Set di environment variable di file server/.env:
# GOOGLE_CLOUD_ACCESS_TOKEN=ya29.a0AfH6SMBx...
```

**Cara 1b: Menggunakan Helper Script (Lebih Mudah)**
```bash
# Dari folder server/
npm run get-google-token

# Script akan menampilkan token yang siap di-copy
# Copy ke file server/.env
```

**Cara 2: Menggunakan OAuth 2.0 Playground**
1. Buka: https://developers.google.com/oauthplayground/
2. Di kiri, scroll ke "Cloud Platform"
3. Centang: "https://www.googleapis.com/auth/cloud-platform"
4. Klik "Authorize APIs"
5. Login dengan akun Google Cloud Anda
6. Klik "Exchange authorization code for tokens"
7. Copy "Access token"
8. Set di environment variable:
   ```env
   GOOGLE_CLOUD_ACCESS_TOKEN=ya29.a0AfH6SMBx...
   ```

**Cara 3: Menggunakan curl (dengan OAuth 2.0)**
```bash
# Install Google OAuth 2.0 Client Library terlebih dahulu
# Atau gunakan gcloud untuk mendapatkan token
gcloud auth print-access-token > token.txt
# Copy isi token.txt ke GOOGLE_CLOUD_ACCESS_TOKEN
```

**Catatan Penting:**
- Access token akan expire setelah 1 jam
- Untuk production, gunakan Service Account (Option B)
- Untuk development, gunakan gcloud CLI (Option A)

## API Endpoint

### POST /api/virtual-try-on

**Headers:**
```
Authorization: Bearer <user-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "personImage": "base64-encoded-person-image",
  "productImage": "base64-encoded-product-image",
  "sampleCount": 1
}
```

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "mimeType": "image/png",
      "bytesBase64Encoded": "base64-encoded-result-image"
    }
  ]
}
```

## Usage

1. User membuka halaman detail produk
2. Klik tombol "Virtual Try-On"
3. Upload foto diri sendiri
4. Klik "Generate Virtual Try-On"
5. Hasil akan ditampilkan dan bisa di-download

## Notes

- **Region**: Default region adalah `us-central1`. Pastikan region yang digunakan mendukung Virtual Try-On API
- **Image Size**: Maksimal ukuran gambar person adalah 10MB
- **Sample Count**: Bisa menghasilkan 1-4 gambar (default: 1)
- **Processing Time**: Proses generate bisa memakan waktu 30-60 detik
- **Cost**: Virtual Try-On API dikenakan biaya sesuai pricing Google Cloud

## Troubleshooting

### Error: "Failed to authenticate with Google Cloud"
- Pastikan `gcloud` CLI sudah terinstall dan sudah login
- Atau set `GOOGLE_CLOUD_ACCESS_TOKEN` di environment variables

### Error: "Google Cloud Project ID not configured"
- Pastikan `GOOGLE_CLOUD_PROJECT_ID` sudah di-set di `.env`

### Error: "Vertex AI API not enabled"
- Jalankan: `gcloud services enable aiplatform.googleapis.com`

### Error: "Invalid region"
- Pastikan region yang digunakan mendukung Virtual Try-On API
- Cek dokumentasi Google Cloud untuk region yang didukung

## References

- [Google Cloud Vertex AI Virtual Try-On Documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/virtual-try-on-api?hl=id)
- [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs)

