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

## District Asal (Origin District)

**Penting**: API baru menggunakan **district ID**, bukan city ID untuk menghitung shipping cost.

Default district asal harus diset. Anda dapat mengubahnya dengan menambahkan environment variable:

```env
ORIGIN_DISTRICT_ID=your_district_id_here
```

### Cara Mencari District ID

Untuk mendapatkan ID district, ikuti langkah berikut:

#### Contoh: Mencari District ID untuk "Kec. Johan Pahlawan, Kabupaten Aceh Barat, Aceh"

1. **Cari Provinsi Aceh:**
   ```bash
   GET /api/shipping/provinces
   ```
   Cari provinsi dengan nama "NANGGROE ACEH DARUSSALAM (NAD)" atau "ACEH", catat `province_id`-nya (misalnya: `10`)

2. **Cari Kota/Kabupaten Aceh Barat:**
   ```bash
   GET /api/shipping/cities?province=10
   ```
   Cari kota dengan nama "ACEH BARAT" atau "KABUPATEN ACEH BARAT", catat `city_id`-nya

3. **Cari District Johan Pahlawan:**
   ```bash
   GET /api/shipping/districts?city={city_id}
   ```
   Cari district dengan nama "JOHAN PAHLAWAN" atau "JOHAN PAHLAWAN", catat `district_id`-nya

4. **Set di Environment Variable:**
   ```env
   ORIGIN_DISTRICT_ID={district_id_yang_didapat}
   ```

#### Menggunakan cURL untuk Testing

```bash
# 1. Get Provinces
curl --location 'https://rajaongkir.komerce.id/api/v1/destination/province' \
--header 'Key: YOUR_API_KEY'

# 2. Get Cities (ganti {province_id} dengan ID provinsi Aceh)
curl --location 'https://rajaongkir.komerce.id/api/v1/destination/city/{province_id}' \
--header 'Key: YOUR_API_KEY'

# 3. Get Districts (ganti {city_id} dengan ID kota Aceh Barat)
curl --location 'https://rajaongkir.komerce.id/api/v1/destination/district/{city_id}' \
--header 'Key: YOUR_API_KEY'
```

### Lokasi Default yang Disarankan

Untuk lokasi **"Kec. Johan Pahlawan, Kabupaten Aceh Barat, Aceh"**:
1. Provinsi: Aceh (NANGGROE ACEH DARUSSALAM)
2. Kota/Kabupaten: Aceh Barat
3. District: Johan Pahlawan

Setelah mendapatkan district ID, tambahkan ke `.env`:
```env
ORIGIN_DISTRICT_ID={district_id_johan_pahlawan}
```

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

### 3. GET /api/shipping/districts
Mendapatkan daftar district (kecamatan) berdasarkan kota.

**Endpoint API Komerce**: `/api/v1/destination/district/{city_id}` (menggunakan path parameter)

**Query Parameters:**
- `city` (required): ID kota untuk filter district

**Response:**
```json
{
  "success": true,
  "districts": [
    {
      "district_id": "1360",
      "district_name": "JAKARTA SELATAN",
      "city_id": "575",
      "zip_code": "0"
    },
    ...
  ]
}
```

**Note**: 
- API Komerce mengembalikan format `{ id, name, zip_code }` yang kemudian dikonversi ke format di atas
- Endpoint menggunakan path parameter `{city_id}`, bukan query parameter
- Zip code dari district dapat digunakan untuk mengisi kode pos secara otomatis

### 4. POST /api/shipping/cost
Menghitung biaya ongkos kirim berdasarkan district.

**Endpoint API Komerce**: `/api/v1/calculate/district/domestic-cost`

**Request Body:**
```json
{
  "origin": "1391",          // ID district asal (bukan city ID)
  "destination": "1376",     // ID district tujuan (bukan city ID)
  "weight": 1000,            // Berat dalam gram
  "courier": "jne:pos:tiki", // Kode kurir (bisa multiple dengan format jne:pos:tiki atau single)
  "price": "lowest"          // Sort by price: "lowest" atau "highest" (optional, default: "lowest")
}
```

**Note**: 
- **Penting**: Endpoint baru menggunakan **district ID**, bukan city ID
- Courier bisa multiple dengan format `jne:pos:tiki:sicepat:jnt` dll
- Response langsung berupa array, bukan nested structure

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "code": "jne",
      "name": "Jalur Nugraha Ekakurir (JNE)",
      "costs": [
        {
          "service": "CTC",
          "description": "JNE City Courier",
          "cost": [
            {
              "value": 10000,
              "etd": "1 day",
              "note": ""
            }
          ]
        }
      ]
    },
    {
      "code": "pos",
      "name": "POS Indonesia (POS)",
      "costs": [
        {
          "service": "Pos Reguler",
          "description": "240",
          "cost": [
            {
              "value": 8000,
              "etd": "2 day",
              "note": ""
            }
          ]
        }
      ]
    }
  ]
}
```

**Note**: 
- Response format baru: langsung array di `data`, kemudian di-group by courier
- Setiap item memiliki: `name`, `code`, `service`, `description`, `cost`, `etd`
- API mengembalikan semua courier sekaligus jika menggunakan format multiple courier

## Kurir yang Didukung

Berdasarkan paket RajaOngkir:

- **Starter**: JNE, POS, TIKI
- **Basic**: JNE, POS, TIKI, PCP, ESL, RPX
- **Pro**: Semua kurir termasuk J&T, SICEPAT, dll

## Cara Kerja di Frontend

1. User memilih provinsi → sistem memuat daftar kota di provinsi tersebut
2. User memilih kota → sistem memuat daftar district (kecamatan) di kota tersebut
3. User memilih district → kode pos dapat terisi otomatis dari zip_code district
4. User pindah ke step 2 → sistem menghitung biaya ongkos kirim berdasarkan **district ID** (bukan city ID)
5. Sistem menampilkan semua opsi pengiriman dari berbagai kurir
6. User memilih metode pengiriman → biaya ditambahkan ke total order

**Penting**: 
- API baru **wajib menggunakan district ID** untuk menghitung shipping cost
- Jika district belum dipilih, shipping cost tidak dapat dihitung
- Origin district ID harus diset di environment variable `ORIGIN_DISTRICT_ID`

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

