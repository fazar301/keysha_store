# Panduan Mendapatkan AWB (Air Waybill) Number

AWB (Air Waybill) adalah nomor resi yang didapat dari proses membuat label order melalui API Komerce Delivery Order API.

## Alur Mendapatkan AWB

### 1. Order Dibuat di Sistem
- User membuat order di aplikasi
- Order disimpan dengan informasi shipping (courier, service, cost)
- AWB masih kosong pada tahap ini

### 2. Payment Berhasil
- User melakukan pembayaran (via Midtrans atau metode lain)
- Payment berhasil

### 3. Admin/Merchant Generate Label (Mendapatkan AWB)
- Admin atau Merchant login ke dashboard
- Buka detail order
- Klik tombol "Generate Label" atau "Print Label"
- Sistem akan:
  1. Store order ke Komerce API
  2. Print label untuk mendapatkan AWB
  3. Update order dengan AWB number

## Endpoint untuk Generate Label

### POST /api/order/:orderId/generate-label

**Authorization**: Admin atau Merchant only

**Request Body** (optional, untuk override destination):
```json
{
  "destinationDistrictId": "1376",
  "destinationCityId": "151",
  "destinationProvinceId": "6",
  "weight": 1000
}
```

**Response Success**:
```json
{
  "success": true,
  "message": "Label generated successfully",
  "data": {
    "airwayBill": "KOMERKOMXXXXXXXXXXXXXXXXX",
    "komerceOrderId": "ORDER123456",
    "labelUrl": "https://..."
  }
}
```

**Response Error**:
```json
{
  "success": false,
  "error": "Failed to store order to Komerce"
}
```

## Environment Variables yang Diperlukan

Tambahkan ke `.env` di folder `server`:

```env
# Origin Address (Alamat Gudang/Warehouse)
ORIGIN_NAME=Store Name
ORIGIN_PHONE=081234567890
ORIGIN_ADDRESS=Jl. Contoh No. 123
ORIGIN_DISTRICT_ID=1391
ORIGIN_CITY_ID=151
ORIGIN_PROVINCE_ID=6
ORIGIN_POSTAL_CODE=12345

# Komerce Order API
KOMERCE_ORDER_API_URL=https://api-sandbox.collaborator.komerce.id
KOMERCE_USE_SANDBOX=true
```

## Cara Menggunakan

### 1. Via API Endpoint

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/order/{orderId}/generate-label \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destinationDistrictId": "1376",
    "weight": 1000
  }'
```

### 2. Via Frontend (Admin Dashboard)

Tambahkan tombol "Generate Label" di halaman Order Details untuk Admin/Merchant.

## Retry Label

Jika generate label gagal tapi order sudah di-store ke Komerce, gunakan endpoint retry:

### POST /api/order/:orderId/retry-label

Endpoint ini akan menggunakan `komerceOrderId` yang sudah tersimpan untuk print label ulang.

## Format Data untuk Store Order

Sistem akan otomatis format data sesuai kebutuhan API Komerce:

**Origin** (dari environment variables):
- origin_name
- origin_phone
- origin_address
- origin_district_id
- origin_city_id
- origin_province_id
- origin_postal_code

**Destination** (dari order/user address):
- destination_name (dari user firstName + lastName)
- destination_phone (dari user phoneNumber)
- destination_address (dari default address)
- destination_district_id (dari request body atau order)
- destination_city_id (dari address)
- destination_province_id (dari address)
- destination_postal_code (dari address)

**Shipping**:
- courier (dari order.shipping.courier)
- service (dari order.shipping.service)
- weight (dari request body atau default 1000 gram)

**Items**:
- Array dari cart products dengan name, qty, price

## Troubleshooting

### Error: "Shipping information not found"
- Pastikan order memiliki `shipping.courier` dan `shipping.service`
- Order harus dibuat dengan shipping info dari checkout

### Error: "Default address not found"
- User harus memiliki default address
- Atau kirim destination info via request body

### Error: "Komerce order ID not found"
- Order belum di-store ke Komerce
- Gunakan endpoint `/generate-label` terlebih dahulu

### Error: "AWB number not found in label response"
- Cek response dari API Komerce
- Mungkin format response berbeda
- Cek logs untuk detail response

## Catatan Penting

1. **AWB hanya tersedia setelah label dibuat**: AWB tidak otomatis tersedia saat order dibuat. Harus melalui proses generate label.

2. **Hanya Admin/Merchant yang bisa generate**: Endpoint generate label hanya bisa diakses oleh Admin atau Merchant.

3. **Origin address harus dikonfigurasi**: Pastikan semua environment variables untuk origin address sudah diset.

4. **Destination address**: Sistem akan menggunakan default address user, atau bisa di-override via request body.

5. **Weight**: Default 1000 gram jika tidak dikirim via request body.

## Referensi

- [Komerce Delivery Order API Documentation](https://rajaongkir.com/docs/delivery-order-api)
- [Store Order Endpoint](https://rajaongkir.com/docs/delivery-order-api#store-order)
- [Print Label Endpoint](https://rajaongkir.com/docs/delivery-order-api#label-order)

