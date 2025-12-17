/*
 *
 * Statistics Component
 *
 */

import React from 'react';
import { Card, CardBody, Row, Col } from 'reactstrap';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import LoadingIndicator from '../../components/Common/LoadingIndicator';
import { formatIDR } from '../../utils';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Statistics = props => {
    const { statistics, isLoading, fetchStatistics } = props;

    // Format revenue data for chart
    const revenueChartData = {
        labels: statistics.revenueByMonth?.map(item => item.month) || [],
        datasets: [
            {
                label: 'Revenue (IDR)',
                data: statistics.revenueByMonth?.map(item => item.revenue) || [],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2
            }
        ]
    };

    // Format orders data for chart
    const ordersChartData = {
        labels: statistics.ordersByMonth?.map(item => item.month) || [],
        datasets: [
            {
                label: 'Jumlah Order',
                data: statistics.ordersByMonth?.map(item => item.count) || [],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                tension: 0.4
            }
        ]
    };

    // Format orders by status for doughnut chart
    const statusLabels = Object.keys(statistics.ordersByStatus || {});
    const statusData = Object.values(statistics.ordersByStatus || {});
    const statusColors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)'
    ];

    const statusChartData = {
        labels: statusLabels,
        datasets: [
            {
                data: statusData,
                backgroundColor: statusColors.slice(0, statusLabels.length),
                borderColor: statusColors.slice(0, statusLabels.length).map(color => color.replace('0.6', '1')),
                borderWidth: 2
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top'
            },
            title: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    const lineChartOptions = {
        ...chartOptions,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    };

    if (isLoading) {
        return (
            <div className='statistics-dashboard'>
                <LoadingIndicator />
            </div>
        );
    }

    return (
        <div className='statistics-dashboard'>
            <h2 className='mb-4'>Statistik Penjualan & Transaksi</h2>

            {/* Card Counters */}
            <Row className='mb-4'>
                <Col xs='12' sm='6' md='3' className='mb-3'>
                    <Card className='stat-card'>
                        <CardBody>
                            <div className='stat-card-content'>
                                <div className='stat-icon'>
                                    <i className='fa fa-shopping-bag' style={{ fontSize: '2rem', color: '#007bff' }} />
                                </div>
                                <div className='stat-info'>
                                    <h3 className='stat-value'>{statistics.totals?.orders || 0}</h3>
                                    <p className='stat-label'>Total Orders</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xs='12' sm='6' md='3' className='mb-3'>
                    <Card className='stat-card'>
                        <CardBody>
                            <div className='stat-card-content'>
                                <div className='stat-icon'>
                                    <i className='fa fa-dollar-sign' style={{ fontSize: '2rem', color: '#28a745' }} />
                                </div>
                                <div className='stat-info'>
                                    <h3 className='stat-value'>{formatIDR(statistics.totals?.revenue || 0)}</h3>
                                    <p className='stat-label'>Total Revenue</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xs='12' sm='6' md='3' className='mb-3'>
                    <Card className='stat-card'>
                        <CardBody>
                            <div className='stat-card-content'>
                                <div className='stat-icon'>
                                    <i className='fa fa-users' style={{ fontSize: '2rem', color: '#ffc107' }} />
                                </div>
                                <div className='stat-info'>
                                    <h3 className='stat-value'>{statistics.totals?.users || 0}</h3>
                                    <p className='stat-label'>Total Users</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xs='12' sm='6' md='3' className='mb-3'>
                    <Card className='stat-card'>
                        <CardBody>
                            <div className='stat-card-content'>
                                <div className='stat-icon'>
                                    <i className='fa fa-cube' style={{ fontSize: '2rem', color: '#dc3545' }} />
                                </div>
                                <div className='stat-info'>
                                    <h3 className='stat-value'>{statistics.totals?.products || 0}</h3>
                                    <p className='stat-label'>Total Products</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row className='mb-4'>
                <Col xs='12' lg='8' className='mb-3'>
                    <Card>
                        <CardBody>
                            <h4 className='mb-3'>Revenue per Bulan</h4>
                            <div style={{ height: '300px' }}>
                                <Bar data={revenueChartData} options={chartOptions} />
                            </div>
                        </CardBody>
                    </Card>
                </Col>
                <Col xs='12' lg='4' className='mb-3'>
                    <Card>
                        <CardBody>
                            <h4 className='mb-3'>Orders by Status</h4>
                            <div style={{ height: '300px' }}>
                                <Doughnut data={statusChartData} options={doughnutOptions} />
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Row className='mb-4'>
                <Col xs='12' className='mb-3'>
                    <Card>
                        <CardBody>
                            <h4 className='mb-3'>Jumlah Order per Bulan</h4>
                            <div style={{ height: '300px' }}>
                                <Line data={ordersChartData} options={lineChartOptions} />
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Recent Orders */}
            {statistics.recentOrders && statistics.recentOrders.length > 0 && (
                <Row>
                    <Col xs='12'>
                        <Card>
                            <CardBody>
                                <h4 className='mb-3'>Recent Orders</h4>
                                <div className='table-responsive'>
                                    <table className='table table-striped'>
                                        <thead>
                                            <tr>
                                                <th>Order ID</th>
                                                <th>Customer</th>
                                                <th>Email</th>
                                                <th>Items</th>
                                                <th>Total</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {statistics.recentOrders.map(order => (
                                                <tr key={order._id}>
                                                    <td>{order._id.substring(0, 8)}...</td>
                                                    <td>{order.user}</td>
                                                    <td>{order.email}</td>
                                                    <td>{order.itemsCount}</td>
                                                    <td>{formatIDR(order.total)}</td>
                                                    <td>{new Date(order.created).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default Statistics;

