/**
 *
 * VirtualTryOn
 *
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardBody, Row, Col, Modal, ModalBody, ModalHeader } from 'reactstrap';
import axios from 'axios';
import Button from '../../Common/Button';
import LoadingIndicator from '../../Common/LoadingIndicator';
import { API_URL } from '../../../constants';

const VirtualTryOn = ({ product }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [personImage, setPersonImage] = useState(null);
    const [personImagePreview, setPersonImagePreview] = useState(null);
    const [productImageBase64, setProductImageBase64] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const videoRef = useRef(null);

    // Load and compress product image as base64 when modal opens
    const loadProductImage = async (imageUrl) => {
        try {
            const response = await axios.get(imageUrl, { responseType: 'blob' });
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const maxWidth = 1024;
                        const maxHeight = 1024;

                        // Calculate new dimensions
                        if (width > height) {
                            if (width > maxWidth) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = (width * maxHeight) / height;
                                height = maxHeight;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    const reader2 = new FileReader();
                                    reader2.onloadend = () => {
                                        const base64 = reader2.result.split(',')[1];
                                        resolve(base64);
                                    };
                                    reader2.onerror = reject;
                                    reader2.readAsDataURL(blob);
                                } else {
                                    reject(new Error('Failed to compress product image'));
                                }
                            },
                            'image/jpeg',
                            0.8
                        );
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(response.data);
            });
        } catch (error) {
            console.error('Error loading product image:', error);
            throw error;
        }
    };

    const handleOpenModal = async () => {
        setIsOpen(true);
        setError(null);
        setResults([]);

        // Load product image as base64
        if (product?.imageUrl) {
            try {
                const base64 = await loadProductImage(product.imageUrl);
                setProductImageBase64(base64);
            } catch (error) {
                setError('Failed to load product image');
            }
        }
    };

    const handleCloseModal = () => {
        setIsOpen(false);
        setPersonImage(null);
        setPersonImagePreview(null);
        setResults([]);
        setError(null);
        setShowCamera(false);
        stopCamera();
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Cleanup camera stream on unmount or when modal closes
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const handleStartCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(mediaStream);
            setShowCamera(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setError('Failed to access camera. Please allow camera permissions.');
        }
    };

    const handleCapturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
                    setPersonImage(file);
                    setPersonImagePreview(URL.createObjectURL(blob));
                    stopCamera();
                    setShowCamera(false);
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const handlePersonImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('Image size must be less than 10MB');
                return;
            }

            setError(null);
            setPersonImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPersonImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Compress image before converting to base64
    const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const base64 = reader.result.split(',')[1];
                                    resolve(base64);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            } else {
                                reject(new Error('Failed to compress image'));
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const convertFileToBase64 = (file) => {
        // Use compression for images
        if (file.type.startsWith('image/')) {
            return compressImage(file);
        }

        // For non-image files, use original method
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove data:image/...;base64, prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleGenerate = async () => {
        if (!personImage || !productImageBase64) {
            setError('Please upload a person image');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            // Convert person image to base64
            const personImageBase64 = await convertFileToBase64(personImage);

            // Get token from localStorage or axios defaults
            let token = localStorage.getItem('token') || axios.defaults.headers.common['Authorization'];

            if (!token) {
                setError('Please login to use Virtual Try-On');
                setIsLoading(false);
                return;
            }

            // Ensure token has Bearer prefix (passport JWT requires it)
            // Remove existing Bearer if present to avoid double prefix
            if (token.startsWith('Bearer ')) {
                token = token.substring(7);
            }
            const authToken = `Bearer ${token}`;

            // Call API with increased timeout (2 minutes for image processing)
            const response = await axios.post(
                `${API_URL}/virtual-try-on`,
                {
                    personImage: personImageBase64,
                    productImage: productImageBase64,
                    sampleCount: 1
                },
                {
                    headers: {
                        Authorization: authToken,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000 // 2 minutes timeout
                }
            );

            if (response.data.success && response.data.predictions) {
                setResults(response.data.predictions);
            } else {
                setError(response.data.error || 'Failed to generate virtual try-on');
            }
        } catch (error) {
            console.error('Virtual Try-On error:', error);

            let errorMessage = 'Failed to generate virtual try-on';

            if (error.response) {
                // Handle specific HTTP errors
                if (error.response.status === 401) {
                    errorMessage = 'Please login to use Virtual Try-On feature';
                } else if (error.response.status === 400) {
                    errorMessage = error.response.data?.error || 'Invalid request. Please check your images.';
                } else if (error.response.status === 413) {
                    errorMessage = 'Image size too large. Please use smaller images.';
                } else {
                    errorMessage = error.response.data?.error || error.response.statusText || errorMessage;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className='virtual-try-on-button-overlay'>
                <Button
                    variant='primary'
                    text='Try On'
                    onClick={handleOpenModal}
                    className='virtual-try-on-btn-overlay'
                />
            </div>

            <Modal isOpen={isOpen} toggle={handleCloseModal} size='lg' className='virtual-try-on-modal'>
                <ModalHeader toggle={handleCloseModal}>
                    Try On - {product?.name || 'Product'}
                </ModalHeader>
                <ModalBody>
                    {results.length > 0 ? (
                        // Show only results after generation
                        <div className='results-section'>
                            <h5 className='mb-3 text-center'>Your Try-On Result</h5>
                            <Row>
                                {results.map((result, index) => (
                                    <Col xs='12' key={index} className='mb-3'>
                                        <Card>
                                            <CardBody className='text-center'>
                                                <img
                                                    src={`data:${result.mimeType || 'image/png'};base64,${result.bytesBase64Encoded}`}
                                                    alt={`Virtual try-on result ${index + 1}`}
                                                    className='result-image'
                                                />
                                                <div className='mt-3'>
                                                    <a
                                                        href={`data:${result.mimeType || 'image/png'};base64,${result.bytesBase64Encoded}`}
                                                        download={`try-on-${product?.name || 'product'}-${index + 1}.png`}
                                                        className='btn btn-primary mr-2'
                                                    >
                                                        <i className='fa fa-download' /> Download
                                                    </a>
                                                    <Button
                                                        variant='secondary'
                                                        text='Try Again'
                                                        onClick={() => {
                                                            setResults([]);
                                                            setPersonImage(null);
                                                            setPersonImagePreview(null);
                                                        }}
                                                    />
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ) : (
                        // Show upload/camera options before generation
                        <Row>
                            <Col xs='12' className='mb-3'>
                                <Card>
                                    <CardBody>
                                        <h5 className='mb-3 text-center'>Take or Upload Your Photo</h5>

                                        {showCamera ? (
                                            <div className='camera-section'>
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className='camera-preview'
                                                />
                                                <div className='camera-controls text-center mt-3'>
                                                    <Button
                                                        variant='primary'
                                                        text='Capture Photo'
                                                        onClick={handleCapturePhoto}
                                                        className='mr-2'
                                                    />
                                                    <Button
                                                        variant='secondary'
                                                        text='Cancel'
                                                        onClick={() => {
                                                            stopCamera();
                                                            setShowCamera(false);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='upload-section'>
                                                <div className='upload-options'>
                                                    <input
                                                        type='file'
                                                        accept='image/*'
                                                        onChange={handlePersonImageChange}
                                                        className='d-none'
                                                        id='person-image-upload'
                                                    />
                                                    <label htmlFor='person-image-upload' className='upload-option-btn'>
                                                        <i className='fa fa-upload' />
                                                        <p>Upload Photo</p>
                                                    </label>
                                                    <button
                                                        type='button'
                                                        onClick={handleStartCamera}
                                                        className='upload-option-btn'
                                                    >
                                                        <i className='fa fa-camera' />
                                                        <p>Take Photo</p>
                                                    </button>
                                                </div>

                                                {personImagePreview && (
                                                    <div className='preview-section mt-3'>
                                                        <h6 className='text-center mb-2'>Preview</h6>
                                                        <div className='preview-container'>
                                                            <img
                                                                src={personImagePreview}
                                                                alt='Person preview'
                                                                className='preview-image'
                                                            />
                                                            <button
                                                                type='button'
                                                                onClick={() => {
                                                                    setPersonImage(null);
                                                                    setPersonImagePreview(null);
                                                                }}
                                                                className='remove-preview-btn'
                                                                title='Remove photo'
                                                            >
                                                                <i className='fa fa-times' />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {error && (
                        <div className='alert alert-danger mt-3' role='alert'>
                            {error}
                        </div>
                    )}

                    {results.length === 0 && (
                        <div className='text-center mt-3'>
                            <Button
                                variant='primary'
                                text='Generate Try-On'
                                onClick={handleGenerate}
                                disabled={!personImage || !productImageBase64 || isLoading}
                            />
                        </div>
                    )}

                    {isLoading && (
                        <div className='text-center mt-4'>
                            <LoadingIndicator inline />
                            <p className='mt-2'>Generating try-on image...</p>
                        </div>
                    )}
                </ModalBody>
            </Modal>
        </>
    );
};

export default VirtualTryOn;

