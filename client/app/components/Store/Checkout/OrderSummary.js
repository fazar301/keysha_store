import React from 'react';
import { Card, CardBody } from 'reactstrap';
import Button from '../../Common/Button';
import { formatIDR } from '../../../utils';

const OrderSummary = props => {
  const { items = [], subtotal = 0, shipping = 0, discount = 0, total = 0, onCheckout, canCheckout } = props;

  return (
    <Card className='order-summary-card'>
      <CardBody>
        <h4>Ringkasan Pesanan</h4>
        <div className='summary-list'>
          {items && items.length > 0 && (
            <div className='mb-3'>
              <p>{items[0].name} x {items[0].quantity}</p>
            </div>
          )}

          <div className='d-flex summary-row'>
            <div>Subtotal</div>
            <div className='ml-auto'>{formatIDR(subtotal)}</div>
          </div>
          <div className='d-flex summary-row'>
            <div>Ongkos Kirim</div>
            <div className='ml-auto'>{formatIDR(shipping)}</div>
          </div>
          <div className='d-flex summary-row'>
            <div>Diskon</div>
            <div className='ml-auto'>-{formatIDR(Math.round(discount))}</div>
          </div>

          <hr />
          <div className='d-flex summary-row font-weight-bold'>
            <div>Total</div>
            <div className='ml-auto'>{formatIDR(Math.round(total))}</div>
          </div>

          <div className='mt-3'>
            <Button
              variant='primary'
              text='Lanjut ke Pembayaran'
              onClick={onCheckout}
              disabled={!canCheckout}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default OrderSummary;
