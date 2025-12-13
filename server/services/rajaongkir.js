const axios = require('axios');

const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || '';
// API key untuk delivery order (store order, print label) - berbeda dengan RAJAONGKIR_API_KEY
const SHIPPING_DELIVERY_API_KEY = process.env.SHIPPING_DELIVERY_API_KEY || '';
// API baru dari Komerce - migrasi dari API lama yang sudah tidak aktif
const RAJAONGKIR_BASE_URL = process.env.RAJAONGKIR_BASE_URL || 'https://rajaongkir.komerce.id';
// API untuk delivery order (tracking, label, dll)
// Gunakan sandbox untuk development, production untuk live
const USE_SANDBOX = process.env.KOMERCE_USE_SANDBOX !== 'false' && process.env.NODE_ENV !== 'production';
const KOMERCE_ORDER_API_URL = USE_SANDBOX
    ? (process.env.KOMERCE_ORDER_API_URL || 'https://api-sandbox.collaborator.komerce.id')
    : (process.env.KOMERCE_ORDER_API_URL || 'https://api.collaborator.komerce.id');

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
     * Mendapatkan daftar district (kecamatan) berdasarkan kota
     * API Komerce endpoint: /api/v1/destination/district/{city_id}
     * Menggunakan path parameter
     */
    async getDistricts(cityId = null) {
        if (!cityId) {
            return {
                success: false,
                error: 'City ID is required'
            };
        }
        const endpoint = `/api/v1/destination/district/${cityId}`;
        return await this.makeRequest(endpoint);
    }

    /**
     * Menghitung biaya ongkos kirim berdasarkan district
     * API Komerce endpoint: /api/v1/calculate/district/domestic-cost
     * @param {Number} origin - ID district asal
     * @param {Number} destination - ID district tujuan
     * @param {Number} weight - Berat dalam gram
     * @param {String} courier - Kode kurir (bisa multiple dengan format jne:pos:tiki atau single)
     * @param {String} price - Sort by price (lowest/highest), default: lowest
     */
    async getShippingCost(origin, destination, weight, courier = 'jne:pos:tiki', price = 'lowest') {
        // Endpoint baru menggunakan form-urlencoded
        const endpoint = '/api/v1/calculate/district/domestic-cost';
        try {
            const config = {
                method: 'POST',
                url: `${this.baseURL}${endpoint}`,
                headers: {
                    'Key': this.apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: new URLSearchParams({
                    origin: origin.toString(),
                    destination: destination.toString(),
                    weight: weight.toString(),
                    courier: courier.toLowerCase(),
                    price: price
                }).toString()
            };

            const response = await axios(config);

            // API Komerce menggunakan format response dengan meta dan data
            if (response.data) {
                if (response.data.meta) {
                    const meta = response.data.meta;

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

                // Fallback untuk format lain
                if (response.data.success === false || response.data.code === 410) {
                    return {
                        success: false,
                        error: response.data.message || response.data.error || 'API endpoint tidak aktif'
                    };
                }

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
            console.error('RajaOngkir Shipping Cost API Error:', error.response?.data || error.message);
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
     * Mendapatkan history tracking AWB (Air Waybill)
     * API Komerce endpoint: /order/api/v1/orders/history-airway-bill
     * @param {String} courier - Nama kurir (jne, pos, tiki, dll)
     * @param {String} airwayBill - Nomor AWB yang akan di-track
     */
    async getTrackingHistory(courier, airwayBill) {
        const endpoint = '/order/api/v1/orders/history-airway-bill';

        try {
            // Normalize courier name untuk API Komerce
            // API mengharapkan format lowercase tanpa spasi
            const normalizedCourier = courier.toLowerCase().trim().replace(/\s+/g, '');

            // Gunakan SHIPPING_DELIVERY_API_KEY untuk tracking (sama dengan store order dan print label)
            const deliveryApiKey = SHIPPING_DELIVERY_API_KEY || this.apiKey;

            const config = {
                method: 'GET',
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                headers: {
                    'x-api-key': deliveryApiKey,
                    'Content-Type': 'application/json'
                },
                params: {
                    shipping: normalizedCourier,
                    airway_bill: airwayBill
                }
            };

            console.log('Tracking request:', { courier: normalizedCourier, airwayBill, url: config.url });

            const response = await axios(config);

            // API Komerce menggunakan format response dengan meta dan data
            if (response.data) {
                if (response.data.meta) {
                    const meta = response.data.meta;

                    if (meta.status === 'success' && meta.code === 200) {
                        return {
                            success: true,
                            data: response.data.data || {}
                        };
                    } else {
                        return {
                            success: false,
                            error: meta.message || 'API request failed'
                        };
                    }
                }

                // Fallback untuk format lain
                if (response.data.success === false || response.data.code === 400) {
                    return {
                        success: false,
                        error: response.data.meta?.message || response.data.error || 'AWB data not found'
                    };
                }

                return {
                    success: true,
                    data: response.data.data || response.data
                };
            }

            return {
                success: false,
                error: 'No data received from API'
            };
        } catch (error) {
            console.error('RajaOngkir Tracking API Error:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.meta?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to connect to RajaOngkir Tracking API';
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Store Order ke Komerce
     * API Komerce endpoint: /order/api/v1/orders/store
     * @param {Object} orderData - Data order untuk disimpan
     */
    async storeOrder(orderData) {
        const endpoint = '/order/api/v1/orders/store';

        try {
            // Gunakan SHIPPING_DELIVERY_API_KEY untuk store order
            const deliveryApiKey = SHIPPING_DELIVERY_API_KEY || this.apiKey;

            if (!deliveryApiKey) {
                return {
                    success: false,
                    error: 'SHIPPING_DELIVERY_API_KEY is required for store order. Please set it in environment variables.'
                };
            }

            const config = {
                method: 'POST',
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                headers: {
                    'x-api-key': deliveryApiKey,
                    'Content-Type': 'application/json'
                },
                data: orderData
            };

            console.log('Store Order request:', {
                endpoint: config.url,
                isSandbox: USE_SANDBOX,
                apiUrl: KOMERCE_ORDER_API_URL,
                nodeEnv: process.env.NODE_ENV,
                data: orderData
            });

            const response = await axios(config);

            // API Komerce menggunakan format response dengan meta dan data
            if (response.data) {
                if (response.data.meta) {
                    const meta = response.data.meta;

                    // Success code bisa 200 atau 201 sesuai dokumentasi (201 untuk create order)
                    if (meta.status === 'success' && (meta.code === 200 || meta.code === 201)) {
                        return {
                            success: true,
                            data: response.data.data || {}
                        };
                    } else {
                        return {
                            success: false,
                            error: meta.message || 'API request failed'
                        };
                    }
                }

                return {
                    success: true,
                    data: response.data.data || response.data
                };
            }

            return {
                success: false,
                error: 'No data received from API'
            };
        } catch (error) {
            console.error('RajaOngkir Store Order API Error:', {
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                isSandbox: USE_SANDBOX,
                error: error.response?.data || error.message,
                status: error.response?.status
            });

            // Handle specific error cases
            let errorMessage = error.response?.data?.meta?.message ||
                error.response?.data?.error ||
                error.response?.data?.data ||
                error.message ||
                'Failed to store order to RajaOngkir API';

            // Check for insufficient balance error
            if (error.response?.data?.data === 'Insufficent Balance' ||
                error.response?.data?.meta?.message?.toLowerCase().includes('balance') ||
                errorMessage.toLowerCase().includes('insufficient') ||
                errorMessage.toLowerCase().includes('balance')) {

                // Jika menggunakan sandbox, berikan informasi yang berbeda
                if (USE_SANDBOX) {
                    errorMessage = 'Saldo Komerce tidak mencukupi. Meskipun menggunakan sandbox, API Komerce masih memvalidasi saldo. Silakan: 1) Top up saldo di dashboard Komerce sandbox, atau 2) Pastikan menggunakan sandbox API key yang benar, atau 3) Hubungi support Komerce untuk informasi saldo sandbox.';
                } else {
                    errorMessage = 'Saldo Komerce tidak mencukupi untuk membuat order. Silakan top up saldo terlebih dahulu melalui dashboard Komerce.';
                }
            }

            return {
                success: false,
                error: errorMessage,
                isSandbox: USE_SANDBOX,
                apiUrl: KOMERCE_ORDER_API_URL
            };
        }
    }

    /**
     * Print Label Order untuk mendapatkan AWB
     * API Komerce endpoint: /order/api/v1/orders/print-label
     * @param {String} orderNo - Order number dari Komerce (dari store order response)
     * @param {String} page - Format label (page_1, page_2, page_4, page_5, page_6)
     */
    async printLabel(orderNo, page = 'page_5') {
        const endpoint = '/order/api/v1/orders/print-label';

        try {
            // Gunakan SHIPPING_DELIVERY_API_KEY untuk print label
            const deliveryApiKey = SHIPPING_DELIVERY_API_KEY || this.apiKey;

            if (!deliveryApiKey) {
                return {
                    success: false,
                    error: 'SHIPPING_DELIVERY_API_KEY is required for print label. Please set it in environment variables.'
                };
            }

            // Gunakan query parameter sesuai dokumentasi
            const config = {
                method: 'POST',
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                headers: {
                    'x-api-key': deliveryApiKey,
                    'Content-Type': 'application/json'
                },
                params: {
                    order_no: orderNo,
                    page: page
                }
            };

            console.log('Print Label request:', { endpoint: config.url, orderId });

            const response = await axios(config);

            // API Komerce menggunakan format response dengan meta dan data
            if (response.data) {
                if (response.data.meta) {
                    const meta = response.data.meta;

                    if (meta.status === 'success' && meta.code === 200) {
                        return {
                            success: true,
                            data: response.data.data || {}
                        };
                    } else {
                        return {
                            success: false,
                            error: meta.message || 'API request failed'
                        };
                    }
                }

                return {
                    success: true,
                    data: response.data.data || response.data
                };
            }

            return {
                success: false,
                error: 'No data received from API'
            };
        } catch (error) {
            console.error('RajaOngkir Print Label API Error:', error.response?.data || error.message);
            const errorMessage = error.response?.data?.meta?.message ||
                error.response?.data?.error ||
                error.message ||
                'Failed to print label from RajaOngkir API';
            return {
                success: false,
                error: errorMessage
            };
        }
    }
}

module.exports = new RajaOngkirService();

