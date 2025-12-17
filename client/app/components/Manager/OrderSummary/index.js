/**
 *
 * OrderSummary
 *
 */

import React from 'react';

import { Col } from 'reactstrap';
import { formatIDR } from '../../../utils';

const OrderSummary = props => {
  const { order } = props;

  // Calculate subtotal dari products (jika ada) - ini adalah total nilai barang saja
  const subtotal = order.products?.reduce((sum, item) => {
    return sum + ((item.product?.price || item.purchasePrice || 0) * (item.quantity || 1));
  }, 0) || (order.total - (order.shipping?.cost || 0));

  // Shipping cost dari order
  const shippingCost = order.shipping?.cost || 0;

  // Discount dari order
  const discount = order.discount || 0;

  // Total = subtotal (nilai barang) + shipping cost (ongkir) - discount
  const total = subtotal + shippingCost - discount;

  return (
    <Col className='order-summary pt-3'>
      <h2>Ringkasan Pesanan</h2>
      <div className='d-flex align-items-center summary-item'>
        <p className='summary-label'>Subtotal</p>
        <p className='summary-value ml-auto'>{formatIDR(subtotal)}</p>
      </div>

      <div className='d-flex align-items-center summary-item'>
        <p className='summary-label'>Pengiriman & Penanganan</p>
        <p className='summary-value ml-auto'>{formatIDR(shippingCost)}</p>
      </div>

      {discount > 0 && (
        <div className='d-flex align-items-center summary-item'>
          <p className='summary-label'>Diskon</p>
          <p className='summary-value ml-auto'>-{formatIDR(discount)}</p>
        </div>
      )}

      <hr />
      <div className='d-flex align-items-center summary-item'>
        <p className='summary-label'><strong>Total</strong></p>
        <p className='summary-value ml-auto'><strong>{formatIDR(total)}</strong></p>
      </div>
    </Col>
  );
};

export default OrderSummary;
