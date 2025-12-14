/**
 *
 * CartSummary
 *
 */

import React from 'react';

import { Container, Row, Col } from 'reactstrap';
import { formatIDR } from '../../../utils';

const CartSummary = props => {
  const { cartTotal } = props;

  return (
    <div className='cart-summary'>
      <Container>
        <Row className='mb-2 summary-item'>
          <Col xs='9'>
            <p className='summary-label'>Total</p>
          </Col>
          <Col xs='3' className='text-right'>
            <p className='summary-value'>{formatIDR(cartTotal)}</p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CartSummary;
