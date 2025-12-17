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
            // Validasi AWB
            if (!airwayBill || airwayBill.trim() === '') {
                return {
                    success: false,
                    error: 'AWB number is required'
                };
            }

            // Validasi format AWB (biasanya format KOMERKOM... atau alphanumeric)
            const cleanAWB = airwayBill.trim();
            
            // AWB biasanya minimal 10 karakter dan alphanumeric
            if (cleanAWB.length < 10) {
                return {
                    success: false,
                    error: `AWB number terlalu pendek: "${cleanAWB}". AWB biasanya minimal 10 karakter.`
                };
            }

            // Map courier ke format yang diharapkan API Komerce
            // API tracking mengharapkan format lowercase sederhana (jne, pos, tiki, dll)
            const mapCourierForTracking = (courierName) => {
                if (!courierName) return 'jne'; // Default

                const courierLower = courierName.toLowerCase().trim();
                
                // Mapping courier codes ke format tracking API
                const courierMap = {
                    'jne': 'jne',
                    'pos': 'pos',
                    'pos indonesia': 'pos',
                    'tiki': 'tiki',
                    'sicepat': 'sicepat',
                    'jnt': 'jnt',
                    'j&t': 'jnt',
                    'jnt express': 'jnt',
                    'ninja': 'ninja',
                    'ninja express': 'ninja',
                    'lion': 'lion',
                    'lion parcel': 'lion',
                    'anteraja': 'anteraja',
                    'rex': 'rex',
                    'rpx': 'rpx',
                    'sentral': 'sentral',
                    'star': 'star',
                    'wahana': 'wahana',
                    'dse': 'dse',
                    'idexpress': 'idexpress',
                    'id express': 'idexpress',
                    'sap': 'sap',
                    'gosend': 'gosend'
                };

                // Cek apakah courier ada di map
                if (courierMap[courierLower]) {
                    return courierMap[courierLower];
                }

                // Jika tidak ada di map, coba extract code dari name
                const extractedCode = courierLower.split(' ')[0];
                if (courierMap[extractedCode]) {
                    return courierMap[extractedCode];
                }

                // Jika masih tidak ditemukan, gunakan lowercase dari input (remove spaces)
                return courierLower.replace(/\s+/g, '');
            };

            const normalizedCourier = mapCourierForTracking(courier);

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
                    airway_bill: cleanAWB
                }
            };

            console.log('Tracking request:', { 
                originalCourier: courier,
                normalizedCourier: normalizedCourier, 
                airwayBill: cleanAWB, 
                url: config.url,
                params: config.params
            });

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
            console.error('RajaOngkir Tracking API Error:', {
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                courier: courier,
                airwayBill: airwayBill,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            // Extract error message dengan lebih detail
            let errorMessage = 'Failed to connect to RajaOngkir Tracking API';
            
            if (error.response?.data) {
                if (error.response.data.meta?.message) {
                    errorMessage = error.response.data.meta.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Berikan saran jika error terkait invalid AWB
            if (errorMessage.toLowerCase().includes('invalid') || 
                errorMessage.toLowerCase().includes('not found') ||
                errorMessage.toLowerCase().includes('cnote')) {
                errorMessage = 'AWB belum tersedia di sistem tracking. Ini biasanya terjadi karena: 1) Paket belum di-pickup oleh kurir, 2) AWB belum aktif di sistem kurir (butuh waktu beberapa saat setelah generate label), atau 3) AWB number tidak valid. Silakan coba lagi setelah beberapa saat atau pastikan paket sudah di-pickup.';
            }
            
            return {
                success: false,
                error: errorMessage,
                details: error.response?.data || null,
                status: error.response?.status
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

            console.log('Print Label request:', { 
                endpoint: config.url, 
                orderNo, 
                page,
                params: config.params,
                isSandbox: USE_SANDBOX
            });

            const response = await axios(config);

            console.log('Print Label response:', {
                status: response.status,
                data: response.data
            });

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
                        // Berikan error message yang lebih detail
                        const errorMsg = meta.message || 'API request failed';
                        console.error('Print Label failed:', {
                            code: meta.code,
                            status: meta.status,
                            message: errorMsg,
                            orderNo: orderNo
                        });
                        return {
                            success: false,
                            error: errorMsg,
                            code: meta.code,
                            details: response.data.data || null
                        };
                    }
                }

                // Fallback untuk format response lain
                if (response.data.success === false || response.data.error) {
                    console.error('Print Label failed (fallback):', response.data);
                    return {
                        success: false,
                        error: response.data.error || response.data.message || 'Failed to print label',
                        details: response.data.data || null
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
            console.error('RajaOngkir Print Label API Error:', {
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                orderNo: orderNo,
                page: page,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            // Extract error message dengan lebih detail
            let errorMessage = 'Failed to print label from RajaOngkir API';
            
            if (error.response?.data) {
                if (error.response.data.meta?.message) {
                    errorMessage = error.response.data.meta.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                error: errorMessage,
                details: error.response?.data || null,
                status: error.response?.status
            };
        }
    }

    /**
     * Schedule Pickup Order
     * API Komerce endpoint: /order/api/v1/pickup/request
     * @param {String} orderNo - Order number dari Komerce
     * @param {String} pickupDate - Tanggal pickup (YYYY-MM-DD)
     * @param {String} pickupTime - Waktu pickup (HH:MM)
     * @param {String} pickupVehicle - Jenis kendaraan (Motor/Mobil/Truk)
     */
    async schedulePickup(orderNo, pickupDate, pickupTime, pickupVehicle = 'Motor') {
        const endpoint = '/order/api/v1/pickup/request';

        try {
            // Gunakan SHIPPING_DELIVERY_API_KEY untuk schedule pickup
            const deliveryApiKey = SHIPPING_DELIVERY_API_KEY || this.apiKey;

            if (!deliveryApiKey) {
                return {
                    success: false,
                    error: 'SHIPPING_DELIVERY_API_KEY is required for schedule pickup. Please set it in environment variables.'
                };
            }

            const config = {
                method: 'POST',
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                headers: {
                    'x-api-key': deliveryApiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: {
                    pickup_date: pickupDate,
                    pickup_time: pickupTime,
                    pickup_vehicle: pickupVehicle,
                    orders: [
                        {
                            order_no: orderNo
                        }
                    ]
                }
            };

            console.log('Schedule Pickup request:', {
                endpoint: config.url,
                orderNo: orderNo,
                pickupDate: pickupDate,
                pickupTime: pickupTime,
                pickupVehicle: pickupVehicle,
                isSandbox: USE_SANDBOX
            });

            const response = await axios(config);

            console.log('Schedule Pickup response:', {
                status: response.status,
                data: response.data
            });

            // API Komerce menggunakan format response dengan meta dan data
            if (response.data) {
                if (response.data.meta) {
                    const meta = response.data.meta;

                    if (meta.status === 'success' && (meta.code === 200 || meta.code === 201)) {
                        // Cek status dari data array
                        const pickupData = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
                        
                        if (pickupData && pickupData.status === 'success') {
                            return {
                                success: true,
                                data: pickupData,
                                awb: pickupData.awb || null
                            };
                        } else {
                            // Pickup request dibuat tapi status failed
                            return {
                                success: false,
                                error: `Pickup request failed for order ${orderNo}`,
                                details: pickupData || response.data.data
                            };
                        }
                    } else {
                        return {
                            success: false,
                            error: meta.message || 'Failed to schedule pickup',
                            code: meta.code,
                            details: response.data.data || null
                        };
                    }
                }

                // Fallback untuk format response lain
                if (response.data.success === false || response.data.error) {
                    return {
                        success: false,
                        error: response.data.error || response.data.message || 'Failed to schedule pickup',
                        details: response.data.data || null
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
            console.error('RajaOngkir Schedule Pickup API Error:', {
                url: `${KOMERCE_ORDER_API_URL}${endpoint}`,
                orderNo: orderNo,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });

            let errorMessage = 'Failed to schedule pickup from RajaOngkir API';

            if (error.response?.data) {
                if (error.response.data.meta?.message) {
                    errorMessage = error.response.data.meta.message;
                } else if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage,
                details: error.response?.data || null,
                status: error.response?.status
            };
        }
    }
}

module.exports = new RajaOngkirService();

