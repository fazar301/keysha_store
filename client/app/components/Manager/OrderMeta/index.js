/**
 *
 * OrderMeta
 *
 */

import React from 'react';

import { Row, Col } from 'reactstrap';

import { CART_ITEM_STATUS, ROLES } from '../../../constants';
import { formatDate } from '../../../utils/date';
import Button from '../../Common/Button';
import { ArrowBackIcon } from '../../Common/Icon';

const OrderMeta = props => {
  const { order, user, cancelOrder, generateLabel, retryLabel, onBack } = props;

  const isAdminOrMerchant = user?.role === ROLES.Admin || user?.role === ROLES.Merchant;
  const hasAWB = order.shipping?.airwayBill;
  const hasKomerceOrderId = order.shipping?.komerceOrderId;

  const handleGenerateLabel = () => {
    if (generateLabel) {
      // Jika sudah ada komerceOrderId tapi belum ada AWB, gunakan retry
      if (hasKomerceOrderId && !hasAWB) {
        retryLabel(order._id);
      } else {
        // Generate label baru
        generateLabel(order._id);
      }
    }
  };

  const renderMetaAction = () => {
    const actions = [];
    const isNotDelivered =
      order.products.filter(i => i.status === CART_ITEM_STATUS.Delivered)
        .length < 1;

    if (isNotDelivered) {
      actions.push(
        <Button key='cancel' size='sm' text='Cancel Order' onClick={cancelOrder} className='mr-2' />
      );
    }

    // Tombol Generate Label hanya untuk Admin/Merchant
    if (isAdminOrMerchant && order.shipping?.courier) {
      if (!hasAWB) {
        actions.push(
          <Button
            key='generate-label'
            size='sm'
            variant='primary'
            text={hasKomerceOrderId ? 'Retry Generate Label' : 'Generate Label'}
            onClick={handleGenerateLabel}
          />
        );
      }
    }

    return actions.length > 0 ? <div>{actions}</div> : null;
  };

  return (
    <div className='order-meta'>
      <div className='d-flex align-items-center justify-content-between mb-3 title'>
        <h2 className='mb-0'>Order Details</h2>
        <Button
          variant='link'
          icon={<ArrowBackIcon />}
          size='sm'
          text='Back to orders'
          onClick={onBack}
        ></Button>
      </div>

      <Row>
        <Col xs='12' md='8'>
          <Row>
            <Col xs='4'>
              <p className='one-line-ellipsis'>Order ID</p>
            </Col>
            <Col xs='8'>
              <span className='order-label one-line-ellipsis'>{` ${order._id}`}</span>
            </Col>
          </Row>
          <Row>
            <Col xs='4'>
              <p className='one-line-ellipsis'>Order Date</p>
            </Col>
            <Col xs='8'>
              <span className='order-label one-line-ellipsis'>{` ${formatDate(
                order.created
              )}`}</span>
            </Col>
          </Row>
          {order.shipping?.airwayBill && (
            <Row className='mt-2'>
              <Col xs='4'>
                <p className='one-line-ellipsis'>Nomor Resi (AWB)</p>
              </Col>
              <Col xs='8'>
                <span className='order-label one-line-ellipsis'>
                  <code>{order.shipping.airwayBill}</code>
                </span>
              </Col>
            </Row>
          )}
          {order.shipping?.courier && (
            <Row className='mt-2'>
              <Col xs='4'>
                <p className='one-line-ellipsis'>Kurir</p>
              </Col>
              <Col xs='8'>
                <span className='order-label one-line-ellipsis'>
                  {order.shipping.courier.toUpperCase()}
                </span>
              </Col>
            </Row>
          )}
          {order.shippingAddress && (
            <>
              <Row className='mt-3'>
                <Col xs='12'>
                  <h5 className='mb-3'>Alamat Pengiriman</h5>
                </Col>
              </Row>
              {order.shippingAddress.fullName && (
                <Row className='mt-2'>
                  <Col xs='4'>
                    <p className='one-line-ellipsis'>Nama Penerima</p>
                  </Col>
                  <Col xs='8'>
                    <span className='order-label one-line-ellipsis'>
                      {order.shippingAddress.fullName}
                    </span>
                  </Col>
                </Row>
              )}
              {order.shippingAddress.phone && (
                <Row className='mt-2'>
                  <Col xs='4'>
                    <p className='one-line-ellipsis'>No. Telepon</p>
                  </Col>
                  <Col xs='8'>
                    <span className='order-label one-line-ellipsis'>
                      {order.shippingAddress.phone}
                    </span>
                  </Col>
                </Row>
              )}
              {order.shippingAddress.email && (
                <Row className='mt-2'>
                  <Col xs='4'>
                    <p className='one-line-ellipsis'>Email</p>
                  </Col>
                  <Col xs='8'>
                    <span className='order-label one-line-ellipsis'>
                      {order.shippingAddress.email}
                    </span>
                  </Col>
                </Row>
              )}
              {order.shippingAddress.address && (
                <Row className='mt-2'>
                  <Col xs='4'>
                    <p className='one-line-ellipsis'>Alamat</p>
                  </Col>
                  <Col xs='8'>
                    <span className='order-label one-line-ellipsis'>
                      {order.shippingAddress.address}
                    </span>
                  </Col>
                </Row>
              )}
              {(order.shippingAddress.districtName || order.shippingAddress.cityName || order.shippingAddress.provinceName) && (
                <Row className='mt-2'>
                  <Col xs='4'>
                    <p className='one-line-ellipsis'>Kecamatan/Kota/Provinsi</p>
                  </Col>
                  <Col xs='8'>
                    <span className='order-label one-line-ellipsis'>
                      {[order.shippingAddress.districtName, order.shippingAddress.cityName, order.shippingAddress.provinceName].filter(Boolean).join(', ')}
                    </span>
                  </Col>
                </Row>
              )}
              {order.shippingAddress.postalCode && (
                <Row className='mt-2'>
                  <Col xs='4'>
                    <p className='one-line-ellipsis'>Kode POS</p>
                  </Col>
                  <Col xs='8'>
                    <span className='order-label one-line-ellipsis'>
                      {order.shippingAddress.postalCode}
                    </span>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Col>
        <Col xs='12' md='4' className='text-left text-md-right'>
          {renderMetaAction()}
        </Col>
      </Row>
    </div>
  );
};

export default OrderMeta;
