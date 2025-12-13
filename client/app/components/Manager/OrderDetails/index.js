/**
 *
 * OrderDetails
 *
 */

import React from 'react';

import { Row, Col } from 'reactstrap';

import OrderMeta from '../OrderMeta';
import OrderItems from '../OrderItems';
import OrderSummary from '../OrderSummary';
import OrderTracking from '../OrderTracking';

const OrderDetails = props => {
  const { order, user, cancelOrder, updateOrderItemStatus, generateLabel, retryLabel, onBack } = props;
  return (
    <div className='order-details'>
      <Row>
        <Col xs='12' md='12'>
          <OrderMeta
            order={order}
            user={user}
            cancelOrder={cancelOrder}
            generateLabel={generateLabel}
            retryLabel={retryLabel}
            onBack={onBack}
          />
        </Col>
      </Row>
      <Row className='mt-5'>
        <Col xs='12' lg='8'>
          <OrderItems
            order={order}
            user={user}
            updateOrderItemStatus={updateOrderItemStatus}
          />
          {order?.shipping?.airwayBill && (
            <div className='mt-4'>
              <OrderTracking order={order} />
            </div>
          )}
        </Col>
        <Col xs='12' lg='4' className='mt-5 mt-lg-0'>
          <OrderSummary order={order} />
        </Col>
      </Row>
    </div>
  );
};

export default OrderDetails;
