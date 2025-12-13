# Panduan Mencari Origin District ID

Dokumen ini menjelaskan cara mencari District ID untuk lokasi origin (gudang/warehouse).

## Lokasi yang Dicari

**Alamat**: 549M+492, Gampa, Kec. Johan Pahlawan, Kabupaten Aceh Barat, Aceh 23611

**Hierarki Lokasi**:
- Provinsi: Aceh (NANGGROE ACEH DARUSSALAM)
- Kabupaten: Aceh Barat
- Kecamatan: Johan Pahlawan

## Langkah-langkah

### 1. Cari Provinsi Aceh

**Endpoint**: `GET /api/shipping/provinces`

**cURL Command**:
```bash
curl --location 'https://rajaongkir.komerce.id/api/v1/destination/province' \
--header 'Key: YOUR_API_KEY'
```

**Cari di response**: Provinsi dengan nama "NANGGROE ACEH DARUSSALAM (NAD)" atau "ACEH"

**Contoh Response**:
```json
{
  "meta": {
    "message": "Success Get Province",
    "code": 200,
    "status": "success"
  },
  "data": [
    {
      "id": 10,
      "name": "NANGGROE ACEH DARUSSALAM (NAD)"
    }
  ]
}
```

**Catat**: `province_id = 10` (atau ID yang sesuai)

### 2. Cari Kota/Kabupaten Aceh Barat

**Endpoint**: `GET /api/shipping/cities?province=10`

**cURL Command**:
```bash
curl --location 'https://rajaongkir.komerce.id/api/v1/destination/city/10' \
--header 'Key: YOUR_API_KEY'
```

**Cari di response**: Kota/Kabupaten dengan nama "ACEH BARAT" atau "KABUPATEN ACEH BARAT"

**Contoh Response**:
```json
{
  "meta": {
    "message": "Success Get District By City ID",
    "code": 200,
    "status": "success"
  },
  "data": [
    {
      "id": 123,
      "name": "ACEH BARAT",
      "zip_code": "23611"
    }
  ]
}
```

**Catat**: `city_id = 123` (atau ID yang sesuai)

### 3. Cari District Johan Pahlawan

**Endpoint**: `GET /api/shipping/districts?city=123`

**cURL Command**:
```bash
curl --location 'https://rajaongkir.komerce.id/api/v1/destination/district/123' \
--header 'Key: YOUR_API_KEY'
```

**Cari di response**: District dengan nama "JOHAN PAHLAWAN"

**Contoh Response**:
```json
{
  "meta": {
    "message": "Success Get District By City ID",
    "code": 200,
    "status": "success"
  },
  "data": [
    {
      "id": 456,
      "name": "JOHAN PAHLAWAN",
      "zip_code": "23611"
    }
  ]
}
```

**Catat**: `district_id = 456` (atau ID yang sesuai)

### 4. Set di Environment Variable

Setelah mendapatkan district ID, tambahkan ke file `.env` di folder `server`:

```env
ORIGIN_DISTRICT_ID=456
```

**Catatan**: Ganti `456` dengan district ID yang sebenarnya dari API.

## Menggunakan API Endpoint Aplikasi

Anda juga bisa menggunakan endpoint aplikasi untuk mencari:

1. **Get Provinces**:
   ```
   GET http://localhost:3000/api/shipping/provinces
   ```

2. **Get Cities**:
   ```
   GET http://localhost:3000/api/shipping/cities?province=10
   ```

3. **Get Districts**:
   ```
   GET http://localhost:3000/api/shipping/districts?city=123
   ```

## Verifikasi

Setelah set `ORIGIN_DISTRICT_ID`, restart server dan test dengan:

```bash
POST /api/shipping/cost
{
  "origin": "456",  // District ID yang sudah diset
  "destination": "1376",  // District ID tujuan (contoh)
  "weight": 1000,
  "courier": "jne:pos:tiki"
}
```

Jika berhasil, response akan menampilkan opsi pengiriman dari berbagai kurir.

