const express = require('express');
const router = express.Router();
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const auth = require('../../middleware/auth');

/**
 * POST /api/virtual-try-on
 * Generate virtual try-on image using Google Cloud Vertex AI
 */
router.post('/', auth, async (req, res) => {
    try {
        const { personImage, productImage, sampleCount = 1 } = req.body;

        // Validate inputs
        if (!personImage || !productImage) {
            return res.status(400).json({
                success: false,
                error: 'Person image and product image are required'
            });
        }

        // Validate sampleCount
        const count = parseInt(sampleCount);
        if (isNaN(count) || count < 1 || count > 4) {
            return res.status(400).json({
                success: false,
                error: 'Sample count must be between 1 and 4'
            });
        }

        // Get Google Cloud credentials from environment
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

        if (!projectId) {
            return res.status(500).json({
                success: false,
                error: 'Google Cloud Project ID not configured'
            });
        }

        // Get access token using gcloud CLI
        let accessToken;
        try {
            const { stdout } = await execPromise('gcloud auth print-access-token');
            accessToken = stdout.trim();
        } catch (error) {
            // Fallback: try to get token from environment or use service account
            if (process.env.GOOGLE_CLOUD_ACCESS_TOKEN) {
                accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN;
            } else {
                console.error('Error getting access token:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Failed to authenticate with Google Cloud. Please ensure gcloud CLI is configured or set GOOGLE_CLOUD_ACCESS_TOKEN environment variable.'
                });
            }
        }

        // Prepare request body for Vertex AI API
        const requestBody = {
            instances: [
                {
                    personImage: {
                        image: {
                            bytesBase64Encoded: personImage
                        }
                    },
                    productImages: [
                        {
                            image: {
                                bytesBase64Encoded: productImage
                            }
                        }
                    ]
                }
            ],
            parameters: {
                sampleCount: count
            }
        };

        // Optional: Add storage URI if configured
        if (process.env.GCS_OUTPUT_BUCKET) {
            requestBody.parameters.storageUri = `gs://${process.env.GCS_OUTPUT_BUCKET}/virtual-try-on/${Date.now()}`;
        }

        // Call Vertex AI API
        const apiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/virtual-try-on-preview-08-04:predict`;

        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=utf-8'
            },
            timeout: 120000 // 2 minutes timeout
        });

        if (response.data && response.data.predictions) {
            res.status(200).json({
                success: true,
                predictions: response.data.predictions.map(pred => ({
                    mimeType: pred.mimeType || 'image/png',
                    bytesBase64Encoded: pred.bytesBase64Encoded
                }))
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Invalid response from Vertex AI API'
            });
        }
    } catch (error) {
        console.error('Virtual Try-On error:', error);

        let errorMessage = 'Failed to generate virtual try-on image';
        if (error.response) {
            errorMessage = error.response.data?.error?.message || error.response.statusText || errorMessage;
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(error.response?.status || 500).json({
            success: false,
            error: errorMessage
        });
    }
});

module.exports = router;

