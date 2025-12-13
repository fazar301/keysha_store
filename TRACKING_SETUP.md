# Setup Tracking Paket dengan API Komerce

Dokumentasi ini menjelaskan cara menggunakan fitur tracking paket menggunakan API Komerce Delivery Order API.

## Prerequisites

1. API Key dari [collaborator.komerce.id](https://collaborator.komerce.id)
2. API Key harus memiliki akses ke Delivery Order API
3. Pastikan order sudah memiliki AWB (Air Waybill) number

## Environment Variables

Tambahkan variabel berikut ke file `.env` di folder `server`:

```env
# RajaOngkir API Configuration (untuk shipping cost)
RAJAONGKIR_API_KEY=your_api_key_here
RAJAONGKIR_BASE_URL=https://rajaongkir.komerce.id

# Komerce Order API Configuration (untuk tracking, label, dll)
KOMERCE_ORDER_API_URL=https://api-sandbox.collaborator.komerce.id
KOMERCE_USE_SANDBOX=true  # Set ke false untuk production
```

### Catatan:
- **Sandbox URL**: `https://api-sandbox.collaborator.komerce.id` (untuk testing)
- **Production URL**: `https://api.collaborator.komerce.id` (untuk production)
- Set `KOMERCE_USE_SANDBOX=false` untuk menggunakan production API

## API Endpoints

### GET /api/shipping/tracking

Mendapatkan history tracking AWB (Air Waybill).

**Query Parameters:**
- `courier` (required): Nama kurir (jne, pos, tiki, sicepat, jnt, dll)
- `airwayBill` (required): Nomor AWB yang akan di-track

**Response:**
```json
{
  "success": true,
  "tracking": {
    "airway_bill": "KOMERKOMXXXXXXXXXXXXXXXXX",
    "last_status": "On Delivery",
    "history": [
      {
        "desc": "Paket sedang dalam perjalanan",
        "date": "2024-01-15 10:30:00",
        "code": "ON_DELIVERY",
        "status": "On Delivery"
      },
      {
        "desc": "Paket telah di-pickup",
        "date": "2024-01-14 14:20:00",
        "code": "PICKUP",
        "status": "Picked Up"
      }
    ]
  }
}
```

## Cara Kerja

1. **Order Created**: Saat order dibuat, informasi shipping (courier, service, cost) disimpan
2. **Label Generated**: Setelah label order dibuat (via API Komerce), AWB number akan tersedia
3. **Tracking Display**: Komponen `OrderTracking` otomatis menampilkan tracking history jika AWB tersedia
4. **Auto Refresh**: User dapat klik tombol "Refresh" untuk update tracking terbaru

## Model Order

Order model sudah diperbarui untuk menyimpan informasi shipping:

```javascript
{
  shipping: {
    courier: "jne",
    service: "REG",
    cost: 15000,
    airwayBill: "KOMERKOMXXXXXXXXXXXXXXXXX"  // AWB dari label order
  }
}
```

## Komponen UI

### OrderTracking Component

Komponen tracking otomatis muncul di halaman Order Details jika:
- Order memiliki `shipping.airwayBill`
- Order memiliki `shipping.courier`

**Fitur:**
- Menampilkan nomor AWB dan kurir
- Menampilkan status terakhir
- Menampilkan timeline riwayat pengiriman
- Tombol refresh untuk update tracking
- Auto-load saat komponen mount

## Testing

### 1. Test dengan cURL

```bash
curl --location 'https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/history-airway-bill?shipping=jne&airway_bill=KOMERKOMXXXXXXXXXXXXXXXXX' \
--header 'x-api-key: YOUR_API_KEY'
```

### 2. Test via Endpoint Aplikasi

```bash
GET http://localhost:3000/api/shipping/tracking?courier=jne&airwayBill=KOMERKOMXXXXXXXXXXXXXXXXX
```

## Menambahkan AWB ke Order

AWB number biasanya didapat setelah:
1. Order dibuat
2. Label order dibuat via API `/order/api/v1/orders/print-label`
3. AWB dari response label disimpan ke order

**Contoh update order dengan AWB:**

```javascript
// Di server, setelah label order dibuat
await Order.updateOne(
  { _id: orderId },
  { 
    $set: { 
      'shipping.airwayBill': awbNumber 
    } 
  }
);
```

## Troubleshooting

### Error: "AWB data not found"
- Pastikan AWB number benar
- Pastikan courier name sesuai (case sensitive)
- Pastikan paket sudah di-pickup oleh kurir

### Error: "Failed to get tracking information"
- Cek API key valid dan aktif
- Cek koneksi ke API Komerce
- Pastikan menggunakan environment yang benar (sandbox/production)

### Tracking History Kosong
- Paket mungkin belum di-pickup oleh kurir
- Tunggu beberapa saat setelah pickup
- Beberapa kurir mungkin delay dalam update tracking

### AWB Tidak Tersedia
- AWB hanya tersedia setelah label order dibuat
- Pastikan proses label order sudah selesai
- Cek apakah AWB sudah disimpan di database order

## Referensi

- [Dokumentasi Komerce Delivery Order API](https://rajaongkir.com/docs/delivery-order-api)
- [History AWB Endpoint](https://rajaongkir.com/docs/delivery-order-api#history-awb-order)

