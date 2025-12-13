# Setup RajaOngkir API Integration (Komerce)

Dokumentasi ini menjelaskan cara mengintegrasikan API RajaOngkir baru dari Komerce untuk menghitung biaya ongkos kirim secara dinamis.

## ⚠️ Penting: Migrasi ke API Baru

**API RajaOngkir lama sudah tidak aktif (Error 410).** Anda harus migrasi ke platform baru di [collaborator.komerce.id](https://collaborator.komerce.id).

## Prerequisites

1. Daftar/Masuk akun di [collaborator.komerce.id](https://collaborator.komerce.id) menggunakan akun RajaOngkir yang sudah ada
2. Navigasi ke menu **Integrasi** → **API Key**
3. Dapatkan API Key untuk API baru
4. Lakukan renewal package jika diperlukan

## Environment Variables

Tambahkan variabel berikut ke file `.env` di folder `server`:

```env
# RajaOngkir API Configuration (Komerce)
RAJAONGKIR_API_KEY=your_api_key_here
RAJAONGKIR_BASE_URL=https://rajaongkir.komerce.id
```

### Catatan:
- **Base URL baru**: `https://rajaongkir.komerce.id`
- API Key harus didapatkan dari dashboard [collaborator.komerce.id](https://collaborator.komerce.id)

## Kota Asal (Origin City)

Default kota asal diset ke Jakarta Selatan (ID: 151). Anda dapat mengubahnya dengan menambahkan environment variable:

```env
ORIGIN_CITY_ID=151
```

Untuk mendapatkan ID kota, gunakan endpoint `/api/shipping/cities` atau lihat dokumentasi RajaOngkir.

## API Endpoints

### 1. GET /api/shipping/provinces
Mendapatkan daftar semua provinsi di Indonesia.

**Endpoint API Komerce**: `/api/v1/destination/province`

**Response:**
```json
{
  "success": true,
  "provinces": [
    {
      "province_id": "16",
      "province": "BALI"
    },
    ...
  ]
}
```

**Note**: API Komerce mengembalikan format `{ id, name }` yang kemudian dikonversi ke `{ province_id, province }` untuk kompatibilitas.

### 2. GET /api/shipping/cities
Mendapatkan daftar kota berdasarkan provinsi.

**Endpoint API Komerce**: `/api/v1/destination/city/{province_id}` (menggunakan path parameter)

**Query Parameters:**
- `province` (required): ID provinsi untuk filter kota

**Response:**
```json
{
  "success": true,
  "cities": [
    {
      "city_id": "1360",
      "city_name": "JAKARTA SELATAN",
      "type": "",
      "province_id": "11",
      "zip_code": "0"
    },
    ...
  ]
}
```

**Note**: 
- API Komerce mengembalikan format `{ id, name, zip_code }` yang kemudian dikonversi ke format di atas
- Endpoint menggunakan path parameter `{province_id}`, bukan query parameter
- Field `type` tidak tersedia di response API Komerce untuk endpoint city

### 3. POST /api/shipping/cost
Menghitung biaya ongkos kirim.

**Endpoint API Komerce**: `/api/v1/shipping-cost`

**Request Body:**
```json
{
  "origin": "151",           // ID kota asal (akan dikonversi ke origin_city_id)
  "destination": "1",        // ID kota tujuan (akan dikonversi ke destination_city_id)
  "weight": 1000,            // Berat dalam gram
  "courier": "jne"           // Kode kurir (jne, pos, tiki, dll)
}
```

**Note**: Endpoint internal menggunakan `origin_city_id` dan `destination_city_id`, tapi endpoint kita tetap menggunakan `origin` dan `destination` untuk kompatibilitas.

**Response:**
```json
{
  "success": true,
  "origin": {
    "city_id": "151",
    "province_id": "6",
    "province": "DKI Jakarta",
    "type": "Kota",
    "city_name": "Jakarta Selatan"
  },
  "destination": {
    "city_id": "1",
    "province_id": "1",
    "province": "Bali",
    "type": "Kabupaten",
    "city_name": "Badung"
  },
  "results": [
    {
      "code": "jne",
      "name": "Jalur Nugraha Ekakurir (JNE)",
      "costs": [
        {
          "service": "OKE",
          "description": "Ongkos Kirim Ekonomis",
          "cost": [
            {
              "value": 18000,
              "etd": "2-3",
              "note": ""
            }
          ]
        }
      ]
    }
  ]
}
```

## Kurir yang Didukung

Berdasarkan paket RajaOngkir:

- **Starter**: JNE, POS, TIKI
- **Basic**: JNE, POS, TIKI, PCP, ESL, RPX
- **Pro**: Semua kurir termasuk J&T, SICEPAT, dll

## Cara Kerja di Frontend

1. User memilih provinsi → sistem memuat daftar kota di provinsi tersebut
2. User memilih kota → sistem menghitung biaya ongkos kirim untuk semua kurir
3. User memilih metode pengiriman → biaya ditambahkan ke total order

## Troubleshooting

### Error: "Endpoint API ini sudah tidak aktif" (Code 410)
- **Solusi**: Migrasi ke API baru dengan mengikuti langkah di bagian Prerequisites
- Pastikan menggunakan base URL baru: `https://rajaongkir.komerce.id`
- Dapatkan API Key baru dari dashboard [collaborator.komerce.id](https://collaborator.komerce.id)

### Error: "Invalid API Key"
- Pastikan API key sudah benar di environment variables
- Pastikan menggunakan API Key baru dari dashboard Komerce
- Pastikan API key sudah aktif dan package sudah di-renewal

### Error: "City not found"
- Pastikan ID kota yang digunakan valid
- Gunakan endpoint `/api/shipping/cities` untuk mendapatkan ID kota yang valid
- Perhatikan bahwa ID kota di API baru mungkin berbeda dengan API lama

### Tidak ada opsi pengiriman muncul
- Pastikan kota asal dan tujuan sudah dipilih
- Pastikan berat barang sudah dihitung dengan benar
- Cek console untuk error dari API RajaOngkir
- Pastikan menggunakan API Key yang valid dan aktif

## Testing

1. Test endpoint dengan curl (perhatikan header `Key` dengan huruf K besar):
   ```bash
   curl --location 'https://rajaongkir.komerce.id/api/v1/destination/province' \
   --header 'Key: YOUR_API_KEY'
   ```

   **Penting**: Header harus menggunakan `Key` (huruf K besar), bukan `key` (huruf kecil).

2. Pastikan response mengembalikan data provinsi

## Migrasi dari API Lama

Jika Anda sudah menggunakan API lama sebelumnya:

1. ✅ Update base URL ke `https://rajaongkir.komerce.id`
2. ✅ Dapatkan API Key baru dari dashboard Komerce
3. ✅ Update environment variables
4. ✅ Test endpoint dengan curl terlebih dahulu
5. ✅ Deploy ke production setelah testing berhasil

## Referensi

- [Dashboard Komerce](https://collaborator.komerce.id)
- [Dokumentasi API](https://rajaongkir.com/docs)
- [Bantuan Migrasi](https://bantuan.komerce.id)

