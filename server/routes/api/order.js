const express = require('express');
const router = express.Router();
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Order = require('../../models/order');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const User = require('../../models/user');
const Address = require('../../models/address');
const auth = require('../../middleware/auth');
const mailgun = require('../../services/mailgun');
const store = require('../../utils/store');
const { ROLES, CART_ITEM_STATUS } = require('../../constants');
const midtransClient = require('midtrans-client');
const rajaOngkir = require('../../services/rajaongkir');

router.post('/add', auth, async (req, res) => {
  try {
    const cart = req.body.cartId;
    const total = req.body.total;
    const paymentMethod = req.body.paymentMethod || null;
    const shippingCost = req.body.shippingCost || 0;
    const discountAmount = req.body.discountAmount || 0;
    const shippingInfo = req.body.shippingInfo || null;
    const shippingAddress = req.body.shippingAddress || null;
    const saveAddress = req.body.saveAddress || false;
    const user = req.user._id;

    console.log('Creating order - cart:', cart, 'total:', total, 'paymentMethod:', paymentMethod, 'shipping:', shippingCost, 'discount:', discountAmount, 'shippingInfo:', shippingInfo, 'shippingAddress:', shippingAddress, 'saveAddress:', saveAddress, 'user:', user);

    // Jika user ingin menyimpan alamat, simpan ke Address collection
    if (saveAddress && shippingAddress) {
      try {
        // Set semua address lain menjadi non-default
        await Address.updateMany({ user }, { isDefault: false });

        // Buat address baru sebagai default
        const newAddress = new Address({
          user,
          address: shippingAddress.address || shippingAddress.addressLine || '',
          city: shippingAddress.cityId || '',
          state: shippingAddress.provinceId || '',
          country: shippingAddress.country || 'Indonesia',
          zipCode: shippingAddress.postalCode || '',
          districtId: shippingAddress.districtId || '',
          districtName: shippingAddress.districtName || '',
          isDefault: true
        });
        await newAddress.save();
        console.log('Address saved as default:', newAddress._id);
      } catch (addressError) {
        console.error('Error saving address:', addressError);
        // Jangan gagalkan order jika gagal save address
      }
    }

    const order = new Order({
      cart,
      user,
      total,
      discount: discountAmount || 0,
      shippingAddress: shippingAddress ? {
        fullName: shippingAddress.fullName || '',
        phone: shippingAddress.phone || '',
        email: shippingAddress.email || '',
        address: shippingAddress.address || shippingAddress.addressLine || '',
        cityId: shippingAddress.cityId || '',
        cityName: shippingAddress.cityName || '',
        provinceId: shippingAddress.provinceId || '',
        provinceName: shippingAddress.provinceName || '',
        districtId: shippingAddress.districtId || '',
        districtName: shippingAddress.districtName || '',
        postalCode: shippingAddress.postalCode || '',
        country: shippingAddress.country || 'Indonesia'
      } : undefined,
      shipping: shippingInfo ? {
        courier: shippingInfo.courier || '',
        service: shippingInfo.service || '',
        cost: shippingCost,
        airwayBill: '' // AWB akan diisi setelah label order dibuat
      } : undefined
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
      discount: orderDoc.discount || 0,
      created: orderDoc.created,
      totalTax: 0,
      products: orderDoc?.cart?.products,
      cartId: orderDoc.cart._id,
      shipping: orderDoc.shipping || null,
      shippingAddress: orderDoc.shippingAddress || null
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

/**
 * POST /api/order/:orderId/generate-label
 * Generate label order dan dapatkan AWB number
 * Hanya untuk Admin atau Merchant
 */
router.post('/:orderId/generate-label', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userRole = req.user.role;

    // Hanya Admin atau Merchant yang bisa generate label
    if (userRole !== ROLES.Admin && userRole !== ROLES.Merchant) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Only Admin or Merchant can generate labels.'
      });
    }

    // Get order
    const orderDoc = await Order.findById(orderId)
      .populate('user')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product'
        }
      });

    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Validasi shipping info
    if (!orderDoc.shipping || !orderDoc.shipping.courier) {
      return res.status(400).json({
        success: false,
        error: 'Shipping information not found. Please ensure order has shipping details.'
      });
    }

    // Get user info
    const user = await User.findById(orderDoc.user);

    // Gunakan address dari order (yang diinput saat checkout)
    const orderAddress = orderDoc.shippingAddress;

    // Validasi: pastikan order memiliki address information
    if (!orderAddress || !orderAddress.districtId) {
      return res.status(400).json({
        success: false,
        error: 'Shipping address not found in order. The order was created without address information. Please contact support.'
      });
    }

    // Prepare order data untuk Komerce Store Order API
    // Format sesuai dokumentasi Komerce API
    const cartDoc = await Cart.findById(orderDoc.cart).populate('products.product');

    if (!cartDoc) {
      return res.status(400).json({
        success: false,
        error: 'Cart not found for this order'
      });
    }

    // Format phone number (harus start dengan 62 atau 8, bukan 0 atau +62)
    const formatPhone = (phone) => {
      if (!phone) return '';
      let formatted = phone.toString().trim();
      // Remove +62, 0, spaces, dashes
      formatted = formatted.replace(/^\+62/, '').replace(/^0/, '').replace(/[\s-]/g, '');
      // Jika tidak start dengan 62 atau 8, tambahkan 62
      if (!formatted.startsWith('62') && !formatted.startsWith('8')) {
        formatted = '62' + formatted;
      }
      return formatted;
    };

    // Calculate totals
    const productTotal = cartDoc.products.reduce((sum, item) => {
      return sum + ((item.product?.price || 0) * (item.quantity || 1));
    }, 0);

    const shippingCost = orderDoc.shipping?.cost || 0;
    const shippingCashback = 0; // Default, bisa di-set dari promo
    const serviceFee = 0; // 2.8% dari cod_value jika COD, 0 jika BANK TRANSFER
    const additionalCost = 0;
    const grandTotal = productTotal + shippingCost + additionalCost - shippingCashback;
    const codValue = 0; // 0 untuk BANK TRANSFER, sama dengan grandTotal untuk COD
    const insuranceValue = Math.round(grandTotal * 0.01); // 1% dari grand total

    // Format order date (YYYY-MM-DD)
    const orderDate = new Date(orderDoc.created).toISOString().split('T')[0];

    // Validasi field required untuk shipper
    if (!process.env.ORIGIN_NAME || !process.env.ORIGIN_PHONE || !process.env.ORIGIN_ADDRESS || !process.env.ORIGIN_EMAIL) {
      return res.status(400).json({
        success: false,
        error: 'Origin address configuration incomplete. Please set ORIGIN_NAME, ORIGIN_PHONE, ORIGIN_ADDRESS, and ORIGIN_EMAIL in environment variables.'
      });
    }

    const komerceOrderData = {
      order_date: orderDate,
      brand_name: process.env.BRAND_NAME || process.env.ORIGIN_NAME || 'Store Name',
      shipper_name: process.env.ORIGIN_NAME,
      shipper_phone: formatPhone(process.env.ORIGIN_PHONE),
      shipper_destination_id: parseInt(process.env.ORIGIN_DISTRICT_ID || '979'),
      shipper_address: process.env.ORIGIN_ADDRESS,
      origin_pin_point: process.env.ORIGIN_PIN_POINT || '',
      shipper_email: process.env.ORIGIN_EMAIL,
      receiver_name: req.body.destinationName || orderAddress.fullName || (user.firstName || '') + ' ' + (user.lastName || '') || 'Customer',
      receiver_phone: formatPhone(req.body.destinationPhone || orderAddress.phone || user.phoneNumber || '81234567890'),
      receiver_destination_id: parseInt(req.body.destinationDistrictId || orderAddress.districtId || ''),
      receiver_address: req.body.destinationAddress || orderAddress.address || '',
      destination_pin_point: req.body.destinationPinPoint || '',
      receiver_email: req.body.destinationEmail || orderAddress.email || user.email || 'customer@example.com',
      shipping: (orderDoc.shipping.courier || 'JNE').toUpperCase(),
      shipping_type: orderDoc.shipping.service || 'REG',
      payment_method: 'BANK TRANSFER', // Default, bisa diubah jika ada COD
      shipping_cost: shippingCost,
      shipping_cashback: shippingCashback,
      service_fee: serviceFee,
      additional_cost: additionalCost,
      grand_total: grandTotal,
      cod_value: codValue,
      insurance_value: insuranceValue,
      order_details: cartDoc.products.map(item => ({
        product_name: item.product?.name || 'Item',
        product_variant_name: item.product?.variant || '',
        product_price: Math.round(item.product?.price || 0),
        product_weight: item.product?.weight || 1000, // gram
        product_width: item.product?.width || 10, // cm
        product_height: item.product?.height || 8, // cm
        product_length: item.product?.length || 50, // cm
        qty: item.quantity || 1,
        subtotal: Math.round((item.product?.price || 0) * (item.quantity || 1))
      }))
    };

    console.log('Storing order to Komerce:', komerceOrderData);

    // Step 1: Store Order ke Komerce
    const storeResult = await rajaOngkir.storeOrder(komerceOrderData);

    if (!storeResult.success) {
      // Berikan error message yang lebih informatif
      let errorMessage = storeResult.error || 'Failed to store order to Komerce';

      // Jika error terkait balance, berikan pesan yang lebih jelas
      if (errorMessage.toLowerCase().includes('balance') ||
        errorMessage.toLowerCase().includes('insufficient') ||
        errorMessage.toLowerCase().includes('saldo')) {
        errorMessage = 'Saldo Komerce tidak mencukupi untuk membuat order. Silakan top up saldo terlebih dahulu melalui dashboard Komerce.';
      }

      return res.status(400).json({
        success: false,
        error: errorMessage,
        errorCode: 'INSUFFICIENT_BALANCE',
        details: 'Pastikan saldo Komerce Anda mencukupi untuk biaya pengiriman. Silakan hubungi administrator untuk top up saldo.'
      });
    }

    const komerceOrderId = storeResult.data.order_id || storeResult.data.id;
    const komerceOrderNo = storeResult.data.order_no || '';

    if (!komerceOrderId && !komerceOrderNo) {
      return res.status(400).json({
        success: false,
        error: 'Komerce order ID or order number not found in response',
        responseData: storeResult.data
      });
    }

    console.log('Order stored to Komerce, order ID:', komerceOrderId, 'order_no:', komerceOrderNo);

    // Step 2: Print Label untuk mendapatkan AWB
    // Gunakan order_no jika ada, jika tidak gunakan order_id
    const orderNoForLabel = komerceOrderNo || komerceOrderId.toString();
    const pageFormat = req.body.page || 'page_5'; // Default thermal 10cm x 10cm
    const labelResult = await rajaOngkir.printLabel(orderNoForLabel, pageFormat);

    if (!labelResult.success) {
      // Order sudah di-store, tapi label gagal
      // Simpan komerce order ID untuk retry nanti
      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            'shipping.komerceOrderId': komerceOrderId
          }
        }
      );

      return res.status(400).json({
        success: false,
        error: labelResult.error || 'Failed to print label. Order stored but AWB not available.',
        komerceOrderId: komerceOrderId // Return untuk retry nanti
      });
    }

    // Extract AWB dari response
    // AWB bisa dari label response atau dari order_no
    const awbNumber = labelResult.data.airway_bill ||
      labelResult.data.awb ||
      labelResult.data.airwayBill ||
      labelResult.data.cnote ||
      komerceOrderNo || // Fallback ke order_no jika AWB tidak ada di response
      komerceOrderId?.toString();

    // Label response memberikan path dan base64, bukan langsung AWB
    // AWB biasanya sama dengan order_no atau bisa di-extract dari label
    const labelPath = labelResult.data.path || '';
    const labelBase64 = labelResult.data.base_64 || '';

    console.log('Label printed, AWB:', awbNumber);

    // Step 3: Update order dengan AWB
    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          'shipping.airwayBill': awbNumber,
          'shipping.komerceOrderId': komerceOrderId,
          'shipping.labelPrintedAt': new Date()
        }
      }
    );

    // Build label URL jika ada path
    const useSandbox = process.env.KOMERCE_USE_SANDBOX !== 'false' && process.env.NODE_ENV !== 'production';
    const komerceOrderApiUrl = useSandbox
      ? (process.env.KOMERCE_ORDER_API_URL || 'https://api-sandbox.collaborator.komerce.id')
      : (process.env.KOMERCE_ORDER_API_URL || 'https://api.collaborator.komerce.id');
    const labelUrl = labelPath ? `${komerceOrderApiUrl}/order${labelPath}` : null;

    res.status(200).json({
      success: true,
      message: 'Label generated successfully',
      data: {
        airwayBill: awbNumber,
        komerceOrderId: komerceOrderId,
        komerceOrderNo: komerceOrderNo,
        labelUrl: labelUrl,
        labelBase64: labelBase64 || null
      }
    });
  } catch (error) {
    console.error('Generate label error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate label',
      details: error.message
    });
  }
});

/**
 * POST /api/order/:orderId/retry-label
 * Retry print label jika sebelumnya gagal (jika sudah ada komerceOrderId)
 */
router.post('/:orderId/retry-label', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userRole = req.user.role;

    if (userRole !== ROLES.Admin && userRole !== ROLES.Merchant) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const orderDoc = await Order.findById(orderId);

    if (!orderDoc) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const komerceOrderId = orderDoc.shipping?.komerceOrderId;

    if (!komerceOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Komerce order ID not found. Please generate label first.'
      });
    }

    // Print label
    const labelResult = await rajaOngkir.printLabel(komerceOrderId);

    if (!labelResult.success) {
      return res.status(400).json({
        success: false,
        error: labelResult.error || 'Failed to print label'
      });
    }

    const awbNumber = labelResult.data.airway_bill ||
      labelResult.data.awb ||
      labelResult.data.airwayBill ||
      labelResult.data.cnote;

    if (!awbNumber) {
      return res.status(400).json({
        success: false,
        error: 'AWB number not found in label response'
      });
    }

    // Update order dengan AWB
    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          'shipping.airwayBill': awbNumber,
          'shipping.labelPrintedAt': new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Label generated successfully',
      data: {
        airwayBill: awbNumber,
        labelUrl: labelResult.data.label_url || labelResult.data.url || null
      }
    });
  } catch (error) {
    console.error('Retry label error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate label'
    });
  }
});

module.exports = router;
