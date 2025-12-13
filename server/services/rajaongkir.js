const axios = require('axios');

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || '';
// API baru dari Komerce - migrasi dari API lama yang sudah tidak aktif
const RAJAONGKIR_BASE_URL = process.env.RAJAONGKIR_BASE_URL || 'https://rajaongkir.komerce.id';

/**
 * Service untuk berinteraksi dengan API RajaOngkir (Komerce)
 */
class RajaOngkirService {
    constructor() {
        this.apiKey = RAJAONGKIR_API_KEY;
        this.baseURL = RAJAONGKIR_BASE_URL;
    }

    /**
     * Membuat request ke API RajaOngkir (Komerce)
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const config = {
                method,
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Key': this.apiKey,  // Case sensitive: 'Key' bukan 'key'
                    'Content-Type': 'application/json'
                }
            };

            if (data && method === 'POST') {
                config.data = data;
            }

            const response = await axios(config);

            // API Komerce menggunakan format response dengan meta dan data
            if (response.data) {
                // Cek format response dengan meta (format baru)
                if (response.data.meta) {
                    const meta = response.data.meta;

                    // Jika status success dan code 200
                    if (meta.status === 'success' && meta.code === 200) {
                        return {
                            success: true,
                            data: response.data.data || []
                        };
                    } else {
                        return {
                            success: false,
                            error: meta.message || 'API request failed'
                        };
                    }
                }

                // Jika response memiliki success: false atau code: 410
                if (response.data.success === false || response.data.code === 410) {
                    return {
                        success: false,
                        error: response.data.message || response.data.error || 'API endpoint tidak aktif. Silakan migrasi ke platform baru di https://collaborator.komerce.id'
                    };
                }

                // Jika response berhasil (format lama)
                if (response.data.success === true || response.status === 200) {
                    return {
                        success: true,
                        data: response.data.data || response.data.results || response.data
                    };
                }

                // Jika response langsung berupa array (untuk beberapa endpoint)
                if (Array.isArray(response.data)) {
                    return {
                        success: true,
                        data: response.data
                    };
                }

                // Default: anggap berhasil jika ada data
                return {
                    success: true,
                    data: response.data.data || response.data.results || response.data
                };
            }

            return {
                success: false,
                error: 'No data received from API'
            };
        } catch (error) {
            console.error('RajaOngkir API Error:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to connect to RajaOngkir API';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Mendapatkan daftar semua provinsi
     * API Komerce endpoint: /api/v1/destination/province
     */
    async getProvinces() {
        return await this.makeRequest('/api/v1/destination/province');
    }

    /**
     * Mendapatkan daftar kota berdasarkan provinsi
     * API Komerce endpoint: /api/v1/destination/city/{province_id}
     * Menggunakan path parameter, bukan query parameter
     */
    async getCities(provinceId = null) {
        if (!provinceId) {
            return {
                success: false,
                error: 'Province ID is required'
            };
        }
        const endpoint = `/api/v1/destination/city/${provinceId}`;
        return await this.makeRequest(endpoint);
    }

    /**
     * Menghitung biaya ongkos kirim
     * API Komerce endpoint: /api/v1/shipping-cost
     * @param {Number} origin - ID kota asal
     * @param {Number} destination - ID kota tujuan
     * @param {Number} weight - Berat dalam gram
     * @param {String} courier - Kode kurir (jne, pos, tiki, dll)
     */
    async getShippingCost(origin, destination, weight, courier = 'jne') {
        const data = {
            origin_city_id: origin.toString(),
            destination_city_id: destination.toString(),
            weight: weight.toString(),
            courier: courier.toLowerCase()
        };

        return await this.makeRequest(`/api/v1/destination/district/${origin}`, 'POST', data);
    }
}

module.exports = new RajaOngkirService();

