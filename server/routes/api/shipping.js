const express = require('express');
const router = express.Router();
const rajaOngkir = require('../../services/rajaongkir');

/**
 * GET /api/shipping/provinces
 * Mendapatkan daftar semua provinsi
 */
router.get('/provinces', async (req, res) => {
    try {
        const result = await rajaOngkir.getProvinces();

        if (result.success) {
            // API Komerce mengembalikan format: { id, name }
            // Convert ke format yang diharapkan frontend: { province_id, province }
            const provinces = Array.isArray(result.data)
                ? result.data.map(p => ({
                    province_id: p.id?.toString() || p.province_id?.toString(),
                    province: p.name || p.province
                }))
                : [];

            res.status(200).json({
                success: true,
                provinces: provinces
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error fetching provinces:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch provinces'
        });
    }
});

/**
 * GET /api/shipping/cities
 * Mendapatkan daftar kota
 * Query params: province (optional) - ID provinsi untuk filter kota
 */
router.get('/cities', async (req, res) => {
    try {
        const { province } = req.query;

        if (!province) {
            return res.status(400).json({
                success: false,
                error: 'Province ID is required'
            });
        }

        const result = await rajaOngkir.getCities(province);

        if (result.success) {
            // API Komerce mengembalikan format: { id, name, zip_code }
            // Convert ke format yang diharapkan frontend: { city_id, city_name, type, province_id }
            const citiesData = Array.isArray(result.data)
                ? result.data
                : (result.data?.cities || result.data?.data || []);

            const cities = citiesData.map(c => ({
                city_id: c.id?.toString() || c.city_id?.toString(),
                city_name: c.name || c.city_name,
                type: '', // API Komerce tidak mengembalikan type di endpoint city
                province_id: province, // Gunakan province ID dari query
                zip_code: c.zip_code || ''
            }));

            res.status(200).json({
                success: true,
                cities: cities
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch cities'
        });
    }
});

/**
 * GET /api/shipping/districts
 * Mendapatkan daftar district (kecamatan)
 * Query params: city (required) - ID kota untuk filter district
 */
router.get('/districts', async (req, res) => {
    try {
        const { city } = req.query;

        if (!city) {
            return res.status(400).json({
                success: false,
                error: 'City ID is required'
            });
        }

        const result = await rajaOngkir.getDistricts(city);

        if (result.success) {
            // API Komerce mengembalikan format: { id, name, zip_code }
            // Convert ke format yang diharapkan frontend: { district_id, district_name, city_id, zip_code }
            const districtsData = Array.isArray(result.data)
                ? result.data
                : (result.data?.districts || result.data?.data || []);

            const districts = districtsData.map(d => ({
                district_id: d.id?.toString() || d.district_id?.toString(),
                district_name: d.name || d.district_name,
                city_id: city, // Gunakan city ID dari query
                zip_code: d.zip_code || ''
            }));

            res.status(200).json({
                success: true,
                districts: districts
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch districts'
        });
    }
});

/**
 * POST /api/shipping/cost
 * Menghitung biaya ongkos kirim berdasarkan district
 * Body: { origin, destination, weight, courier, price }
 * Note: origin dan destination adalah district ID, bukan city ID
 */
router.post('/cost', async (req, res) => {
    try {
        req.body.origin = 979;
        const { origin, destination, weight, courier = 'jne:pos:tiki', price = 'lowest' } = req.body;
        console.log('Shipping cost request:', { origin, destination, weight, courier, price });

        // Validasi input
        if (!origin || !destination || !weight) {
            console.error('Missing required parameters:', { origin, destination, weight });
            return res.status(400).json({
                success: false,
                error: 'Origin (district), destination (district), and weight are required'
            });
        }

        // Jika weight tidak diberikan, gunakan default 1000 gram (1 kg)
        let finalWeight = weight || 1000;
        // Minimum weight 1 gram
        finalWeight = Math.max(finalWeight, 1);

        const result = await rajaOngkir.getShippingCost(
            origin,
            destination,
            finalWeight,
            courier,
            price
        );

        console.log('RajaOngkir API result:', {
            success: result.success,
            dataLength: Array.isArray(result.data) ? result.data.length : 0,
            error: result.error
        });

        if (result.success) {
            // API Komerce mengembalikan array langsung dengan format:
            // { name, code, service, description, cost, etd }
            const shippingData = Array.isArray(result.data) ? result.data : [];

            if (shippingData.length === 0) {
                console.warn('No shipping data returned from API');
                return res.status(200).json({
                    success: true,
                    results: [],
                    message: 'Tidak ada opsi pengiriman tersedia untuk rute ini'
                });
            }

            // Format response untuk memudahkan penggunaan di frontend
            // Group by courier untuk kompatibilitas dengan format lama
            const groupedByCourier = {};

            shippingData.forEach(item => {
                const courierCode = item.code || 'unknown';
                if (!groupedByCourier[courierCode]) {
                    groupedByCourier[courierCode] = {
                        code: courierCode,
                        name: item.name || '',
                        costs: []
                    };
                }

                groupedByCourier[courierCode].costs.push({
                    service: item.service || '',
                    description: item.description || '',
                    cost: [{
                        value: item.cost || 0,
                        etd: item.etd || '',
                        note: ''
                    }]
                });
            });

            // Convert ke array
            const formattedResults = Object.values(groupedByCourier);

            console.log('Formatted results:', formattedResults.length, 'couriers');

            res.status(200).json({
                success: true,
                results: formattedResults
            });
        } else {
            console.error('RajaOngkir API error:', result.error);
            res.status(400).json({
                success: false,
                error: result.error || 'Gagal menghitung biaya pengiriman'
            });
        }
    } catch (error) {
        console.error('Shipping cost calculation error:', error);
        console.error('Error details:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error || error.message || 'Failed to calculate shipping cost'
        });
    }
});

module.exports = router;

