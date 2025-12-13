import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'reactstrap';
import axios from 'axios';

import Input from '../../components/Common/Input';
import Button from '../../components/Common/Button';
import SelectOption from '../../components/Common/SelectOption';

import OrderSummary from '../../components/Store/Checkout/OrderSummary';
import actions from '../../actions';
import { API_URL } from '../../constants';

class Checkout extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      step: 1,
      address: {
        fullName: '',
        email: '',
        phone: '',
        country: 'Indonesia',
        addressLine: '',
        cityId: '',
        cityName: '',
        provinceId: '',
        provinceName: '',
        postalCode: ''
      },
      // Data untuk dropdown
      provinces: [],
      cities: [],
      selectedProvince: null,
      selectedCity: null,
      // Shipping options dari API
      shippingOptions: [],
      shipping: null,
      loadingProvinces: false,
      loadingCities: false,
      loadingShipping: false,
      // Kota asal (default bisa diset di env atau config)
      originCityId: process.env.ORIGIN_CITY_ID || '151', // Default: Jakarta Selatan
      promo: { code: '', applied: false, discount: 0, message: '' }
    };
  }

  componentDidMount() {
    this.fetchProvinces();
  }

  handleAddressChange = (name, value) => {
    this.setState({ address: { ...this.state.address, [name]: value } });
  };

  // Fetch provinsi dari API
  fetchProvinces = async () => {
    this.setState({ loadingProvinces: true });
    try {
      const response = await axios.get(`${API_URL}/shipping/provinces`);
      if (response.data.success) {
        const provinces = response.data.provinces.map(p => ({
          value: p.province_id,
          label: p.province
        }));
        this.setState({ provinces, loadingProvinces: false });
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
      this.setState({ loadingProvinces: false });
    }
  };

  // Handle perubahan provinsi
  handleProvinceChange = async (selectedOption) => {
    this.setState({
      selectedProvince: selectedOption,
      selectedCity: null,
      cities: [],
      address: {
        ...this.state.address,
        provinceId: selectedOption ? selectedOption.value : '',
        provinceName: selectedOption ? selectedOption.label : '',
        cityId: '',
        cityName: ''
      }
    });

    if (selectedOption) {
      this.fetchCities(selectedOption.value);
    }
  };

  // Fetch kota berdasarkan provinsi
  fetchCities = async (provinceId) => {
    this.setState({ loadingCities: true });
    try {
      const response = await axios.get(`${API_URL}/shipping/cities`, {
        params: { province: provinceId }
      });
      if (response.data.success) {
        const cities = response.data.cities.map(c => ({
          value: c.city_id,
          label: c.city_name,
          type: c.type
        }));
        this.setState({ cities, loadingCities: false });
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      this.setState({ loadingCities: false });
    }
  };

  // Handle perubahan kota
  handleCityChange = async (selectedOption) => {
    this.setState({
      selectedCity: selectedOption,
      address: {
        ...this.state.address,
        cityId: selectedOption ? selectedOption.value : '',
        cityName: selectedOption ? selectedOption.label : ''
      }
    });

    // Jika kota dipilih dan sudah di step 2, fetch shipping cost
    if (selectedOption && this.state.step >= 2) {
      this.fetchShippingCost(selectedOption.value);
    }
  };

  // Fetch biaya ongkos kirim
  fetchShippingCost = async (destinationCityId) => {
    const { originCityId } = this.state;
    const { cartItems } = this.props;

    // Hitung berat dari cart items (default 1000 gram per item jika tidak ada berat)
    const weight = cartItems.reduce((total, item) => {
      return total + (item.quantity * 1000); // 1000 gram per item
    }, 0);

    this.setState({ loadingShipping: true, shippingOptions: [] });

    try {
      // Cek semua kurir yang umum digunakan
      const couriers = ['jne', 'pos', 'tiki'];
      const allShippingOptions = [];

      for (const courier of couriers) {
        try {
          const response = await axios.post(`${API_URL}/shipping/cost`, {
            origin: originCityId,
            destination: destinationCityId,
            weight: weight,
            courier: courier
          });

          if (response.data.success && response.data.results) {
            response.data.results.forEach(result => {
              if (result.costs && result.costs.length > 0) {
                result.costs.forEach(service => {
                  service.cost.forEach(cost => {
                    allShippingOptions.push({
                      id: `${result.code}_${service.service}`,
                      courier: result.name,
                      service: service.service,
                      description: service.description,
                      price: cost.value,
                      etd: cost.etd,
                      note: cost.note
                    });
                  });
                });
              }
            });
          }
        } catch (err) {
          console.error(`Error fetching ${courier} shipping cost:`, err);
        }
      }

      // Sort by price
      allShippingOptions.sort((a, b) => a.price - b.price);

      this.setState({
        shippingOptions: allShippingOptions,
        loadingShipping: false
      });
    } catch (error) {
      console.error('Error fetching shipping cost:', error);
      this.setState({ loadingShipping: false });
    }
  };

  validateAddress = () => {
    const { address } = this.state;
    const required = ['fullName', 'email', 'phone', 'addressLine', 'cityId', 'provinceId', 'postalCode'];
    for (const k of required) {
      if (!address[k]) return false;
    }
    return true;
  };

  nextStep = () => {
    const { step, address } = this.state;
    if (step === 1) {
      if (!this.validateAddress()) return this.setState({ addressError: 'Please complete the address form.' });
    }
    if (step === 2) {
      // Jika pindah ke step 2, fetch shipping cost jika kota sudah dipilih
      if (address.cityId) {
        this.fetchShippingCost(address.cityId);
      }
    }
    this.setState({ step: step + 1, addressError: '' });
  };

  prevStep = () => {
    this.setState({ step: Math.max(1, this.state.step - 1) });
  };

  selectShipping = option => {
    this.setState({
      shipping: {
        id: option.id,
        label: `${option.courier} - ${option.service}`,
        price: option.price,
        etd: option.etd,
        description: option.description
      }
    });
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

    if (!shipping) {
      alert('Silakan pilih metode pengiriman terlebih dahulu.');
      return;
    }

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
    const shippingCost = shipping ? shipping.price : 0;
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
                    <Col md='6'><Input label='Negara' name='country' value={address.country} onInputChange={this.handleAddressChange} disabled /></Col>
                    <Col md='12'><Input label='Alamat Jalan' name='addressLine' value={address.addressLine} onInputChange={this.handleAddressChange} /></Col>
                    <Col md='6'>
                      <SelectOption
                        label='Provinsi'
                        options={this.state.provinces}
                        value={this.state.selectedProvince}
                        handleSelectChange={this.handleProvinceChange}
                        disabled={this.state.loadingProvinces}
                      />
                    </Col>
                    <Col md='6'>
                      <SelectOption
                        label='Kota'
                        options={this.state.cities}
                        value={this.state.selectedCity}
                        handleSelectChange={this.handleCityChange}
                        disabled={this.state.loadingCities || !this.state.selectedProvince}
                      />
                    </Col>
                    <Col md='12'><Input label='Kode POS' name='postalCode' value={address.postalCode} onInputChange={this.handleAddressChange} /></Col>
                  </Row>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3>Metode Pengiriman</h3>
                  {!this.state.address.cityId && (
                    <p className='text-warning'>Silakan pilih kota tujuan di langkah sebelumnya untuk melihat opsi pengiriman.</p>
                  )}
                  {this.state.loadingShipping && (
                    <p className='text-info'>Memuat opsi pengiriman...</p>
                  )}
                  {this.state.shippingOptions.length === 0 && this.state.address.cityId && !this.state.loadingShipping && (
                    <p className='text-danger'>Tidak ada opsi pengiriman tersedia. Silakan coba lagi.</p>
                  )}
                  <div className='shipping-options'>
                    {this.state.shippingOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`shipping-item ${shipping && shipping.id === option.id ? 'selected' : ''}`}
                        onClick={() => this.selectShipping(option)}
                      >
                        <div className='title'>{option.courier} - {option.service}</div>
                        <div className='subtitle'>{option.description} {option.etd ? `(${option.etd} hari)` : ''}</div>
                        <div className='price'>Rp {option.price.toLocaleString('id-ID')}</div>
                      </div>
                    ))}
                  </div>
                  {!this.state.shipping && this.state.shippingOptions.length > 0 && (
                    <p className='text-warning mt-2'>Silakan pilih metode pengiriman.</p>
                  )}
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
                  <Button
                    text='Berikutnya'
                    onClick={this.nextStep}
                    disabled={step === 2 && !shipping}
                  />
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
