const express = require('express');
const router = express.Router();
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Order = require('../../models/order');
const User = require('../../models/user');
const Product = require('../../models/product');
const Cart = require('../../models/cart');
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const { ROLES } = require('../../constants');

// Get statistics - Admin only
router.get('/', auth, role.check(ROLES.Admin), async (req, res) => {
    try {
        // Get date range (default: last 12 months)
        const { months = 12 } = req.query;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months));

        // Total statistics
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total' }
                }
            }
        ]);
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();

        // Orders by status - only count carts that are associated with orders
        const orderCarts = await Order.distinct('cart');
        const ordersByStatus = await Cart.aggregate([
            {
                $match: {
                    _id: { $in: orderCarts }
                }
            },
            {
                $unwind: '$products'
            },
            {
                $group: {
                    _id: '$products.status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Revenue by month (last 12 months)
        const revenueByMonth = await Order.aggregate([
            {
                $match: {
                    created: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$created' },
                        month: { $month: '$created' }
                    },
                    revenue: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Orders by month (last 12 months)
        const ordersByMonth = await Order.aggregate([
            {
                $match: {
                    created: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$created' },
                        month: { $month: '$created' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Format revenue and orders by month for chart
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const revenueChartData = revenueByMonth.map(item => ({
            month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
            revenue: item.revenue,
            orders: item.count
        }));

        const ordersChartData = ordersByMonth.map(item => ({
            month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
            count: item.count
        }));

        // Format orders by status
        const statusMap = {};
        ordersByStatus.forEach(item => {
            statusMap[item._id] = item.count;
        });

        // Recent orders (last 10)
        const recentOrders = await Order.find()
            .sort('-created')
            .limit(10)
            .populate('user', 'firstName lastName email')
            .populate({
                path: 'cart',
                populate: {
                    path: 'products.product',
                    select: 'name price'
                }
            })
            .select('total created shippingAddress');

        const formattedRecentOrders = recentOrders.map(order => ({
            _id: order._id,
            total: order.total,
            created: order.created,
            user: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown',
            email: order.user?.email || '',
            itemsCount: order.cart?.products?.length || 0
        }));

        res.status(200).json({
            success: true,
            statistics: {
                totals: {
                    orders: totalOrders,
                    revenue: totalRevenue[0]?.total || 0,
                    users: totalUsers,
                    products: totalProducts
                },
                ordersByStatus: statusMap,
                revenueByMonth: revenueChartData,
                ordersByMonth: ordersChartData,
                recentOrders: formattedRecentOrders
            }
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(400).json({
            error: 'Your request could not be processed. Please try again.'
        });
    }
});

module.exports = router;

