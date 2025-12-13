/**
 *
 * OrderTracking
 * Komponen untuk menampilkan tracking history paket
 *
 */

import React from 'react';
import { Row, Col } from 'reactstrap';
import axios from 'axios';
import { API_URL } from '../../../constants';
import LoadingIndicator from '../../Common/LoadingIndicator';

class OrderTracking extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            tracking: null,
            loading: false,
            error: null
        };
    }

    componentDidMount() {
        const { order } = this.props;
        if (order?.shipping?.airwayBill && order?.shipping?.courier) {
            this.fetchTracking();
        }
    }

    componentDidUpdate(prevProps) {
        const { order } = this.props;
        if (
            order?.shipping?.airwayBill !== prevProps.order?.shipping?.airwayBill ||
            order?.shipping?.courier !== prevProps.order?.shipping?.courier
        ) {
            if (order?.shipping?.airwayBill && order?.shipping?.courier) {
                this.fetchTracking();
            }
        }
    }

    fetchTracking = async () => {
        const { order } = this.props;
        const { courier, airwayBill } = order.shipping || {};

        if (!courier || !airwayBill) {
            this.setState({ error: 'AWB number or courier not available' });
            return;
        }

        this.setState({ loading: true, error: null });

        try {
            const response = await axios.get(`${API_URL}/shipping/tracking`, {
                params: {
                    courier: courier,
                    airwayBill: airwayBill
                }
            });

            if (response.data.success) {
                this.setState({
                    tracking: response.data.tracking,
                    loading: false
                });
            } else {
                this.setState({
                    error: response.data.error || 'Failed to fetch tracking information',
                    loading: false
                });
            }
        } catch (error) {
            console.error('Error fetching tracking:', error);
            this.setState({
                error: error.response?.data?.error || 'Failed to fetch tracking information',
                loading: false
            });
        }
    };

    render() {
        const { order } = this.props;
        const { tracking, loading, error } = this.state;

        // Jika tidak ada AWB, jangan tampilkan tracking
        if (!order?.shipping?.airwayBill) {
            return (
                <div className='order-tracking'>
                    <h4>Tracking Paket</h4>
                    <p className='text-muted'>Nomor resi (AWB) belum tersedia untuk order ini.</p>
                </div>
            );
        }

        return (
            <div className='order-tracking'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                    <h4>Tracking Paket</h4>
                    <button
                        className='btn btn-sm btn-outline-primary'
                        onClick={this.fetchTracking}
                        disabled={loading}
                    >
                        {loading ? 'Memuat...' : 'Refresh'}
                    </button>
                </div>

                <div className='tracking-info mb-3'>
                    <Row>
                        <Col xs='4'>
                            <strong>Nomor Resi (AWB):</strong>
                        </Col>
                        <Col xs='8'>
                            <code>{order.shipping.airwayBill}</code>
                        </Col>
                    </Row>
                    <Row className='mt-2'>
                        <Col xs='4'>
                            <strong>Kurir:</strong>
                        </Col>
                        <Col xs='8'>
                            {order.shipping.courier?.toUpperCase() || '-'}
                        </Col>
                    </Row>
                    {tracking?.last_status && (
                        <Row className='mt-2'>
                            <Col xs='4'>
                                <strong>Status Terakhir:</strong>
                            </Col>
                            <Col xs='8'>
                                <span className={`badge badge-${this.getStatusBadgeColor(tracking.last_status)}`}>
                                    {tracking.last_status}
                                </span>
                            </Col>
                        </Row>
                    )}
                </div>

                {loading && <LoadingIndicator />}

                {error && (
                    <div className='alert alert-warning'>
                        <strong>Info:</strong> {error}
                    </div>
                )}

                {tracking && tracking.history && tracking.history.length > 0 && (
                    <div className='tracking-history'>
                        <h5 className='mb-3'>Riwayat Pengiriman</h5>
                        <div className='timeline'>
                            {tracking.history.map((item, index) => (
                                <div key={index} className='timeline-item'>
                                    <div className='timeline-marker'></div>
                                    <div className='timeline-content'>
                                        <div className='d-flex justify-content-between align-items-start'>
                                            <div>
                                                <strong>{item.desc || item.description || '-'}</strong>
                                                {item.status && (
                                                    <div className='mt-1'>
                                                        <span className='badge badge-secondary'>{item.status}</span>
                                                        {item.code && (
                                                            <span className='badge badge-light ml-2'>{item.code}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className='text-right'>
                                                <small className='text-muted'>
                                                    {item.date ? this.formatDate(item.date) : '-'}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tracking && (!tracking.history || tracking.history.length === 0) && (
                    <div className='alert alert-info'>
                        <strong>Info:</strong> Belum ada riwayat tracking tersedia. Paket mungkin belum dipickup oleh kurir.
                    </div>
                )}
            </div>
        );
    }

    getStatusBadgeColor = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower.includes('delivered') || statusLower.includes('terkirim')) {
            return 'success';
        }
        if (statusLower.includes('on delivery') || statusLower.includes('dalam perjalanan')) {
            return 'info';
        }
        if (statusLower.includes('cancel') || statusLower.includes('batal')) {
            return 'danger';
        }
        return 'secondary';
    };

    formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };
}

export default OrderTracking;

