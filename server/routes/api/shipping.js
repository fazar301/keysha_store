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
 * POST /api/shipping/cost
 * Menghitung biaya ongkos kirim
 * Body: { origin, destination, weight, courier }
 * Note: Auth tidak wajib untuk endpoint ini, tapi disarankan untuk rate limiting
 */
router.post('/cost', async (req, res) => {
    try {
        const { origin, destination, weight, courier = 'jne' } = req.body;

        // Validasi input
        if (!origin || !destination || !weight) {
            return res.status(400).json({
                success: false,
                error: 'Origin, destination, and weight are required'
            });
        }

        // Jika weight tidak diberikan, gunakan default 1000 gram (1 kg)
        let finalWeight = weight || 1000;

        const result = await rajaOngkir.getShippingCost(
            origin,
            destination,
            finalWeight,
            courier
        );

        if (result.success) {
            // API Komerce mungkin memiliki struktur response yang berbeda
            // Cek apakah data adalah array atau object
            let shippingData = result.data;

            // Jika data adalah object dengan property results atau costs
            if (!Array.isArray(shippingData)) {
                shippingData = shippingData.results || shippingData.costs || shippingData.data || [shippingData];
            }

            // Format response untuk memudahkan penggunaan di frontend
            const formattedResults = shippingData.map(cost => {
                // Handle berbagai format response dari API Komerce
                if (cost.costs && Array.isArray(cost.costs)) {
                    // Format dengan costs array
                    return {
                        code: cost.code || cost.courier_code,
                        name: cost.name || cost.courier_name,
                        costs: cost.costs.map(service => ({
                            service: service.service || service.service_name,
                            description: service.description || service.service_type,
                            cost: Array.isArray(service.cost) ? service.cost.map(c => ({
                                value: c.value || c.price,
                                etd: c.etd || c.estimated_days,
                                note: c.note || ''
                            })) : [{
                                value: service.cost?.value || service.cost?.price || service.price,
                                etd: service.cost?.etd || service.estimated_days || '',
                                note: service.cost?.note || ''
                            }]
                        }))
                    };
                } else {
                    // Format baru API Komerce (flat structure)
                    return {
                        code: cost.courier_code || cost.code,
                        name: cost.courier_name || cost.name,
                        costs: [{
                            service: cost.service_name || cost.service,
                            description: cost.service_type || cost.description,
                            cost: [{
                                value: cost.price || cost.cost || cost.value,
                                etd: cost.estimated_days || cost.etd || '',
                                note: cost.note || ''
                            }]
                        }]
                    };
                }
            });

            res.status(200).json({
                success: true,
                origin: result.data?.origin || result.data?.origin_details || {},
                destination: result.data?.destination || result.data?.destination_details || {},
                results: formattedResults
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Shipping cost calculation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate shipping cost'
        });
    }
});

module.exports = router;

