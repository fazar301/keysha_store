import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'reactstrap';

import Input from '../../components/Common/Input';
import Button from '../../components/Common/Button';
import SelectOption from '../../components/Common/SelectOption';

import OrderSummary from '../../components/Store/Checkout/OrderSummary';
import actions from '../../actions';

class Checkout extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      step: 1,
      address: {
        fullName: '',
        email: '',
        phone: '',
        country: '',
        addressLine: '',
        city: '',
        province: '',
        postalCode: ''
      },
      shipping: { id: 'reguler', label: 'Reguler', price: 50000 },
      promo: { code: '', applied: false, discount: 0, message: '' }
    };
  }

  componentDidMount() { }

  handleAddressChange = (name, value) => {
    this.setState({ address: { ...this.state.address, [name]: value } });
  };

  validateAddress = () => {
    const { address } = this.state;
    const required = ['fullName', 'email', 'phone', 'addressLine', 'city', 'province', 'postalCode'];
    for (const k of required) {
      if (!address[k]) return false;
    }
    return true;
  };

  nextStep = () => {
    const { step } = this.state;
    if (step === 1) {
      if (!this.validateAddress()) return this.setState({ addressError: 'Please complete the address form.' });
    }
    this.setState({ step: step + 1, addressError: '' });
  };

  prevStep = () => {
    this.setState({ step: Math.max(1, this.state.step - 1) });
  };

  selectShipping = option => {
    this.setState({ shipping: option });
  };

  applyPromo = () => {
    const code = this.state.promo.code.trim().toUpperCase();
    if (!code) return;
    let discount = 0;
    if (code === 'SAVE10') discount = 0.1;
    if (code === 'SAVE20') discount = 0.2;

    if (discount > 0) {
      this.setState({ promo: { code, applied: true, discount, message: `Kode promo ${code} berhasil diterapkan!` } });
    } else {
      this.setState({ promo: { code, applied: false, discount: 0, message: `Kode promo tidak valid.` } });
    }
  };

  handlePlaceOrder = () => {
    const { cartTotal, getCartId, addOrder } = this.props;
    const { shipping, promo } = this.state;
    const subtotal = Number(cartTotal) || 0;
    const shippingCost = shipping.price || 0;
    const discountAmount = promo.applied ? subtotal * promo.discount : 0;
    const total = Math.round(subtotal + shippingCost - discountAmount);

    // Ensure cart_id exists before placing order
    Promise.all([getCartId()]).then(() => {
      // dispatch addOrder with total override, shipping, and discount so midtrans uses correct amount
      addOrder('midtrans', total, shippingCost, discountAmount);
    }).catch(err => {
      console.error('Error getting cart ID:', err);
    });
  };

  render() {
    const { cartItems, cartTotal } = this.props;
    const { step, address, shipping, promo, addressError } = this.state;

    const subtotal = Number(cartTotal) || 0;
    const shippingCost = shipping.price || 0;
    const discountAmount = promo.applied ? subtotal * promo.discount : 0;
    const total = subtotal + shippingCost - discountAmount;

    return (
      <div className='checkout-page'>
        <Row>
          <Col md='8'>
            <div className='checkout-steps'>
              <div className='steps-indicator'>
                <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
              </div>

              {step === 1 && (
                <div>
                  <h3>Alamat Pengiriman</h3>
                  {addressError && <p className='text-danger'>{addressError}</p>}
                  <Row>
                    <Col md='6'><Input label='Nama Lengkap' name='fullName' value={address.fullName} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='6'><Input label='Alamat Email' name='email' value={address.email} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='6'><Input label='Nomor Telepon' name='phone' value={address.phone} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='6'><Input label='Negara' name='country' value={address.country} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='12'><Input label='Alamat Jalan' name='addressLine' value={address.addressLine} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='4'><Input label='Kota' name='city' value={address.city} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='4'><Input label='Provinsi' name='province' value={address.province} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='4'><Input label='Kode POS' name='postalCode' value={address.postalCode} onInputChange={this.handleAddressChange} /></Col>
                  </Row>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3>Metode Pengiriman</h3>
                  <div className='shipping-options'>
                    <div className={`shipping-item ${shipping.id === 'reguler' ? 'selected' : ''}`} onClick={() => this.selectShipping({ id: 'reguler', label: 'Reguler', price: 50000 })}>
                      <div className='title'>Reguler</div>
                      <div className='subtitle'>5-7 hari kerja</div>
                      <div className='price'>Rp 50.000</div>
                    </div>
                    <div className={`shipping-item ${shipping.id === 'ekspres' ? 'selected' : ''}`} onClick={() => this.selectShipping({ id: 'ekspres', label: 'Ekspres', price: 100000 })}>
                      <div className='title'>Ekspres</div>
                      <div className='subtitle'>2-3 hari kerja</div>
                      <div className='price'>Rp 100.000</div>
                    </div>
                    <div className={`shipping-item ${shipping.id === 'overnight' ? 'selected' : ''}`} onClick={() => this.selectShipping({ id: 'overnight', label: 'Overnight', price: 250000 })}>
                      <div className='title'>Overnight</div>
                      <div className='subtitle'>Hari kerja berikutnya</div>
                      <div className='price'>Rp 250.000</div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3>Kode Promo</h3>
                  <Row>
                    <Col md='8'>
                      <Input label='Kode Promo' name='promoCode' value={promo.code} onInputChange={(n, v) => this.setState({ promo: { ...promo, code: v } })} />
                    </Col>
                    <Col md='4'>
                      <Button text='Terapkan' onClick={this.applyPromo} />
                    </Col>
                  </Row>
                  {promo.message && <div className={`mt-2 ${promo.applied ? 'text-success' : 'text-danger'}`}>{promo.message}</div>}
                </div>
              )}

              <div className='d-flex justify-content-between mt-4'>
                <Button text='Kembali' variant='link' onClick={this.prevStep} />
                {step < 3 ? (
                  <Button text='Berikutnya' onClick={this.nextStep} />
                ) : (
                  <Button text='Periksa Pesanan' onClick={() => { }} disabled />
                )}
              </div>
            </div>
          </Col>
          <Col md='4'>
            <OrderSummary
              items={cartItems}
              subtotal={subtotal}
              shipping={shippingCost}
              discount={discountAmount}
              total={total}
              onCheckout={() => this.handlePlaceOrder()}
              canCheckout={step === 3}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  cartItems: state.cart.cartItems || [],
  cartTotal: state.cart.cartTotal || 0
});

export default connect(mapStateToProps, actions)(Checkout);
