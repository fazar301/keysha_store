const express = require('express');
const router = express.Router();
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Order = require('../../models/order');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const auth = require('../../middleware/auth');
const mailgun = require('../../services/mailgun');
const store = require('../../utils/store');
const { ROLES, CART_ITEM_STATUS } = require('../../constants');
const midtransClient = require('midtrans-client');

router.post('/add', auth, async (req, res) => {
  try {
    const cart = req.body.cartId;
    const total = req.body.total;
    const paymentMethod = req.body.paymentMethod || null;
    const shippingCost = req.body.shippingCost || 0;
    const discountAmount = req.body.discountAmount || 0;
    const user = req.user._id;

    console.log('Creating order - cart:', cart, 'total:', total, 'paymentMethod:', paymentMethod, 'shipping:', shippingCost, 'discount:', discountAmount, 'user:', user);

    const order = new Order({
      cart,
      user,
      total
    });

    const orderDoc = await order.save();
    console.log('Order saved:', orderDoc._id);

    const cartDoc = await Cart.findById(orderDoc.cart._id).populate({
      path: 'products.product',
      populate: {
        path: 'brand'
      }
    });

    if (!cartDoc) {
      console.error('Cart not found:', orderDoc.cart._id);
      return res.status(400).json({
        error: 'Cart not found. Please try again.'
      });
    }

    const newOrder = {
      _id: orderDoc._id,
      created: orderDoc.created,
      user: orderDoc.user,
      total: orderDoc.total,
      products: cartDoc.products
    };

    await mailgun.sendEmail(order.user.email, 'order-confirmation', newOrder);

    // If client requested Midtrans payment, create a Snap transaction
    if (paymentMethod === 'midtrans') {
      try {
        console.log('Creating Midtrans transaction...');
        const isProduction = process.env.NODE_ENV === 'production';
        const snap = new midtransClient.Snap({
          isProduction,
          serverKey: process.env.SERVER_KEY,
          clientKey: process.env.CLIENT_KEY
        });

        // Calculate product items
        const itemDetails = (cartDoc.products || []).map(p => ({
          id: p.product._id.toString(),
          price: Math.round(p.product.price || 0),
          quantity: p.quantity || 1,
          name: p.product.name || 'Item'
        }));

        // Add shipping as separate item if exists
        if (shippingCost > 0) {
          itemDetails.push({
            id: 'shipping',
            price: Math.round(shippingCost),
            quantity: 1,
            name: 'Ongkos Kirim'
          });
        }

        // Add discount as negative item if exists
        if (discountAmount > 0) {
          itemDetails.push({
            id: 'discount',
            price: -Math.round(discountAmount),
            quantity: 1,
            name: 'Diskon'
          });
        }

        // Calculate total from items to ensure it matches gross_amount
        let itemsTotal = itemDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const grossAmount = Math.round(total);

        // Adjust if there's a rounding difference (max 1 rupiah difference allowed)
        const difference = grossAmount - itemsTotal;
        if (Math.abs(difference) > 0 && itemDetails.length > 0) {
          // Adjust the first product item to match the total
          const firstItem = itemDetails.find(item => item.id !== 'shipping' && item.id !== 'discount');
          if (firstItem) {
            const adjustedPrice = firstItem.price + difference;
            if (adjustedPrice > 0) {
              firstItem.price = adjustedPrice;
              itemsTotal = grossAmount;
              console.log('Adjusted first item price by', difference, 'to match gross_amount');
            }
          }
        }

        console.log('Item details:', JSON.stringify(itemDetails, null, 2));
        console.log('Items total:', itemsTotal, 'Gross amount:', grossAmount, 'Difference:', grossAmount - itemsTotal);

        const parameter = {
          transaction_details: {
            order_id: orderDoc._id.toString(),
            gross_amount: grossAmount
          },
          customer_details: {
            email: req.user.email || '',
            first_name: req.user.name || req.user.firstName || ''
          },
          item_details: itemDetails
        };

        console.log('Midtrans parameter:', parameter);
        const midtransResponse = await snap.createTransaction(parameter);
        console.log('Midtrans transaction created:', midtransResponse.token);

        return res.status(200).json({
          success: true,
          message: `Your order has been placed successfully!`,
          order: { _id: orderDoc._id },
          midtrans: {
            token: midtransResponse.token,
            redirect_url: midtransResponse.redirect_url,
            clientKey: process.env.CLIENT_KEY
          }
        });
      } catch (err) {
        console.error('Midtrans error:', err.message);
        // If Midtrans fails, still return order created but notify error
        return res.status(200).json({
          success: true,
          message: `Your order has been placed but payment initiation failed.`,
          order: { _id: orderDoc._id },
          error: err.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Your order has been placed successfully!`,
      order: { _id: orderDoc._id }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// search orders api
router.get('/search', auth, async (req, res) => {
  try {
    const { search } = req.query;

    if (!Mongoose.Types.ObjectId.isValid(search)) {
      return res.status(200).json({
        orders: []
      });
    }

    let ordersDoc = null;

    if (req.user.role === ROLES.Admin) {
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search)
      }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    } else {
      const user = req.user._id;
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search),
        user
      }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    }

    ordersDoc = ordersDoc.filter(order => order.cart);

    if (ordersDoc.length > 0) {
      const newOrders = ordersDoc.map(o => {
        return {
          _id: o._id,
          total: parseFloat(Number(o.total.toFixed(2))),
          created: o.created,
          products: o.cart?.products
        };
      });

      let orders = newOrders.map(o => store.caculateTaxAmount(o));
      orders.sort((a, b) => b.created - a.created);
      res.status(200).json({
        orders
      });
    } else {
      res.status(200).json({
        orders: []
      });
    }
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch orders api
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const ordersDoc = await Order.find()
      .sort('-created')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments();
    const orders = store.formatOrders(ordersDoc);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch my orders api
router.get('/me', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = req.user._id;
    const query = { user };

    const ordersDoc = await Order.find(query)
      .sort('-created')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments(query);
    const orders = store.formatOrders(ordersDoc);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch order api
router.get('/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    let orderDoc = null;

    if (req.user.role === ROLES.Admin) {
      orderDoc = await Order.findOne({ _id: orderId }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    } else {
      const user = req.user._id;
      orderDoc = await Order.findOne({ _id: orderId, user }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    }

    if (!orderDoc || !orderDoc.cart) {
      return res.status(404).json({
        message: `Cannot find order with the id: ${orderId}.`
      });
    }

    let order = {
      _id: orderDoc._id,
      total: orderDoc.total,
      created: orderDoc.created,
      totalTax: 0,
      products: orderDoc?.cart?.products,
      cartId: orderDoc.cart._id
    };

    order = store.caculateTaxAmount(order);

    res.status(200).json({
      order
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.delete('/cancel/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId });
    const foundCart = await Cart.findOne({ _id: order.cart });

    increaseQuantity(foundCart.products);

    await Order.deleteOne({ _id: orderId });
    await Cart.deleteOne({ _id: order.cart });

    res.status(200).json({
      success: true
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.put('/status/item/:itemId', auth, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const orderId = req.body.orderId;
    const cartId = req.body.cartId;
    const status = req.body.status || CART_ITEM_STATUS.Cancelled;

    const foundCart = await Cart.findOne({ 'products._id': itemId });
    const foundCartProduct = foundCart.products.find(p => p._id == itemId);

    await Cart.updateOne(
      { 'products._id': itemId },
      {
        'products.$.status': status
      }
    );

    if (status === CART_ITEM_STATUS.Cancelled) {
      await Product.updateOne(
        { _id: foundCartProduct.product },
        { $inc: { quantity: foundCartProduct.quantity } }
      );

      const cart = await Cart.findOne({ _id: cartId });
      const items = cart.products.filter(
        item => item.status === CART_ITEM_STATUS.Cancelled
      );

      // All items are cancelled => Cancel order
      if (cart.products.length === items.length) {
        await Order.deleteOne({ _id: orderId });
        await Cart.deleteOne({ _id: cartId });

        return res.status(200).json({
          success: true,
          orderCancelled: true,
          message: `${req.user.role === ROLES.Admin ? 'Order' : 'Your order'
            } has been cancelled successfully`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Item has been cancelled successfully!'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item status has been updated successfully!'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

const increaseQuantity = products => {
  let bulkOptions = products.map(item => {
    return {
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: item.quantity } }
      }
    };
  });

  Product.bulkWrite(bulkOptions);
};

module.exports = router;
