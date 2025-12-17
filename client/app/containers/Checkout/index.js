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
import { formatIDR } from '../../utils';

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
        districtId: '',
        districtName: '',
        postalCode: ''
      },
      // Data untuk dropdown
      provinces: [],
      cities: [],
      districts: [],
      selectedProvince: null,
      selectedCity: null,
      selectedDistrict: null,
      // Shipping options dari API
      shippingOptions: [],
      shipping: null,
      shippingError: null,
      loadingProvinces: false,
      loadingCities: false,
      loadingDistricts: false,
      loadingShipping: false,
      // District asal (default bisa diset di env atau config)
      // Note: API baru menggunakan district ID, bukan city ID
      originDistrictId: process.env.ORIGIN_DISTRICT_ID || '979', // Default district ID (district toko baju)
      promo: { code: '', applied: false, discount: 0, message: '' },
      saveAddress: false, // Checkbox untuk menyimpan alamat
      loadingAddress: false
    };
  }

  componentDidMount() {
    this.fetchProvinces().then(() => {
      // Load default address setelah provinces sudah di-load
      this.loadDefaultAddress();
    });
  }

  // Load default address untuk autofill
  loadDefaultAddress = async () => {
    this.setState({ loadingAddress: true });
    try {
      const response = await axios.get(`${API_URL}/address`);
      if (response.data.addresses && response.data.addresses.length > 0) {
        const defaultAddress = response.data.addresses.find(addr => addr.isDefault) || response.data.addresses[0];

        if (defaultAddress) {
          // Set address state dengan default address
          const newAddress = {
            fullName: defaultAddress.fullName || '',
            email: defaultAddress.email || '',
            phone: defaultAddress.phone || '',
            country: defaultAddress.country || 'Indonesia',
            addressLine: defaultAddress.address || '',
            cityId: defaultAddress.city || '',
            cityName: defaultAddress.cityName || '',
            provinceId: defaultAddress.state || '',
            provinceName: defaultAddress.provinceName || '',
            districtId: defaultAddress.districtId || '',
            districtName: defaultAddress.districtName || '',
            postalCode: defaultAddress.zipCode || ''
          };

          this.setState({ address: newAddress }, async () => {
            // Set selected province setelah state update
            if (defaultAddress.state && this.state.provinces.length > 0) {
              const province = this.state.provinces.find(p => p.value === defaultAddress.state);
              if (province) {
                await this.handleProvinceChange(province);

                // Set selected city setelah cities di-load
                setTimeout(async () => {
                  if (defaultAddress.city && this.state.cities.length > 0) {
                    const city = this.state.cities.find(c => c.value === defaultAddress.city);
                    if (city) {
                      await this.handleCityChange(city);

                      // Set selected district setelah districts di-load
                      setTimeout(() => {
                        if (defaultAddress.districtId && this.state.districts.length > 0) {
                          const district = this.state.districts.find(d => d.value === defaultAddress.districtId);
                          if (district) {
                            this.handleDistrictChange(district);
                          }
                        }
                      }, 500);
                    }
                  }
                }, 500);
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading default address:', error);
      // Tidak perlu error, user bisa input manual
    } finally {
      this.setState({ loadingAddress: false });
    }
  };

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
        return provinces; // Return untuk promise
      }
    } catch (error) {
      console.error('Error fetching provinces:', error);
      this.setState({ loadingProvinces: false });
      return [];
    }
  };

  // Handle perubahan provinsi
  handleProvinceChange = async (selectedOption) => {
    this.setState({
      selectedProvince: selectedOption,
      selectedCity: null,
      selectedDistrict: null,
      cities: [],
      districts: [],
      address: {
        ...this.state.address,
        provinceId: selectedOption ? selectedOption.value : '',
        provinceName: selectedOption ? selectedOption.label : '',
        cityId: '',
        cityName: '',
        districtId: '',
        districtName: ''
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
      selectedDistrict: null,
      districts: [],
      address: {
        ...this.state.address,
        cityId: selectedOption ? selectedOption.value : '',
        cityName: selectedOption ? selectedOption.label : '',
        districtId: '',
        districtName: ''
      }
    });

    // Fetch districts jika kota dipilih
    if (selectedOption) {
      this.fetchDistricts(selectedOption.value);

      // Jika sudah di step 2, fetch shipping cost
      if (this.state.step >= 2) {
        this.fetchShippingCost(selectedOption.value);
      }
    }
  };

  // Fetch district berdasarkan kota
  fetchDistricts = async (cityId) => {
    this.setState({ loadingDistricts: true });
    try {
      const response = await axios.get(`${API_URL}/shipping/districts`, {
        params: { city: cityId }
      });
      if (response.data.success) {
        const districts = response.data.districts.map(d => ({
          value: d.district_id,
          label: d.district_name,
          zip_code: d.zip_code
        }));
        this.setState({ districts, loadingDistricts: false });
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      this.setState({ loadingDistricts: false });
    }
  };

  // Handle perubahan district
  handleDistrictChange = async (selectedOption) => {
    this.setState({
      selectedDistrict: selectedOption,
      address: {
        ...this.state.address,
        districtId: selectedOption ? selectedOption.value : '',
        districtName: selectedOption ? selectedOption.label : '',
        postalCode: selectedOption && selectedOption.zip_code ? selectedOption.zip_code : this.state.address.postalCode
      }
    });

    // Jika district dipilih dan sudah di step 2, fetch shipping cost
    if (selectedOption && this.state.step === 2) {
      console.log('District changed in step 2, fetching shipping cost:', selectedOption.value);
      this.fetchShippingCost(selectedOption.value);
    }
  };

  // Fetch biaya ongkos kirim
  fetchShippingCost = async (destinationDistrictId) => {
    const { originDistrictId, address } = this.state;
    const { cartItems } = this.props;

    // Gunakan district ID dari address jika tersedia, jika tidak gunakan destinationDistrictId
    const finalDestination = address.districtId || destinationDistrictId;

    // Validasi: pastikan origin dan destination district ID ada
    if (!originDistrictId) {
      console.error('Origin district ID missing. Please set ORIGIN_DISTRICT_ID in environment variable.');
      this.setState({
        shippingOptions: [],
        loadingShipping: false,
        shippingError: 'Origin district belum dikonfigurasi. Silakan hubungi administrator.'
      });
      return;
    }

    if (!finalDestination) {
      console.error('Destination district ID missing:', { finalDestination, addressDistrictId: address.districtId, destinationDistrictId });
      this.setState({
        shippingOptions: [],
        loadingShipping: false,
        shippingError: 'Silakan pilih kecamatan (district) terlebih dahulu.'
      });
      return;
    }

    // Hitung berat dari cart items (default 1000 gram per item jika tidak ada berat)
    const weight = cartItems.reduce((total, item) => {
      return total + (item.quantity * 1000); // 1000 gram per item
    }, 0);

    // Minimum weight 1 gram
    const finalWeight = Math.max(weight, 1);

    console.log('Fetching shipping cost:', {
      origin: originDistrictId,
      destination: finalDestination,
      weight: finalWeight
    });

    this.setState({ loadingShipping: true, shippingOptions: [], shippingError: null });

    try {
      // API baru mendukung multiple courier sekaligus
      // Format: jne:pos:tiki:sicepat:jnt:ninja:lion:anteraja:rex:rpx:sentral:star:wahana:dse
      const couriers = 'jne:pos:tiki:sicepat:jnt:ninja:lion:anteraja';

      const response = await axios.post(`${API_URL}/shipping/cost`, {
        origin: originDistrictId,
        destination: finalDestination,
        weight: finalWeight,
        courier: couriers,
        price: 'lowest'
      });

      console.log('Shipping cost response:', response.data);

      if (response.data.success && response.data.results) {
        const allShippingOptions = [];

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

        // Sort by price (sudah di-sort dari API dengan price=lowest)
        allShippingOptions.sort((a, b) => a.price - b.price);

        console.log('Shipping options found:', allShippingOptions.length);

        this.setState({
          shippingOptions: allShippingOptions,
          loadingShipping: false,
          shippingError: allShippingOptions.length === 0 ? 'Tidak ada opsi pengiriman tersedia untuk rute ini.' : null
        });
      } else {
        const errorMsg = response.data.error || 'Tidak ada opsi pengiriman tersedia.';
        console.error('Shipping cost API error:', errorMsg);
        this.setState({
          shippingOptions: [],
          loadingShipping: false,
          shippingError: errorMsg
        });
      }
    } catch (error) {
      console.error('Error fetching shipping cost:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Gagal mengambil data pengiriman. Silakan coba lagi.';
      this.setState({
        shippingOptions: [],
        loadingShipping: false,
        shippingError: errorMsg
      });
    }
  };

  validateAddress = () => {
    const { address } = this.state;
    // District sekarang wajib untuk API baru
    const required = ['fullName', 'email', 'phone', 'addressLine', 'cityId', 'provinceId', 'districtId', 'postalCode'];
    for (const k of required) {
      if (!address[k]) {
        console.warn('Missing required field:', k);
        return false;
      }
    }
    return true;
  };

  nextStep = () => {
    const { step, address } = this.state;

    if (step === 1) {
      // Validasi form alamat
      if (!this.validateAddress()) {
        return this.setState({ addressError: 'Please complete the address form.' });
      }

      // Validasi district ID wajib untuk API baru
      if (!address.districtId) {
        return this.setState({
          addressError: 'Silakan pilih kecamatan (district) terlebih dahulu. District ID diperlukan untuk menghitung biaya pengiriman.'
        });
      }

      // Pindah ke step 2 dan fetch shipping cost
      this.setState({ step: step + 1, addressError: '' }, () => {
        // Callback setelah state update - fetch shipping cost
        console.log('Moving to step 2, fetching shipping cost for district:', address.districtId);
        this.fetchShippingCost(address.districtId);
      });
    } else if (step === 2) {
      // Pindah ke step 3 (promo code)
      this.setState({ step: step + 1, addressError: '' });
    } else {
      // Step lainnya
      this.setState({ step: step + 1, addressError: '' });
    }
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
        description: option.description,
        courier: option.courier, // Simpan untuk tracking
        service: option.service // Simpan untuk tracking
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
    const { shipping, promo, address, saveAddress } = this.state;

    if (!shipping) {
      alert('Silakan pilih metode pengiriman terlebih dahulu.');
      return;
    }

    const subtotal = Number(cartTotal) || 0;
    const shippingCost = shipping.price || 0;
    const discountAmount = promo.applied ? subtotal * promo.discount : 0;
    const total = Math.round(subtotal + shippingCost - discountAmount);

    // Prepare shipping info untuk disimpan di order
    // Gunakan courier code dari id (bukan name) untuk kompatibilitas dengan API Komerce
    const courierCode = shipping.id?.split('_')[0] || shipping.courier?.toLowerCase() || '';
    const shippingInfo = {
      courier: courierCode, // Simpan courier code, bukan name
      service: shipping.service || shipping.id?.split('_')[1] || '',
      cost: shippingCost
    };

    // Prepare shipping address untuk disimpan di order
    const shippingAddressData = {
      fullName: address.fullName,
      email: address.email,
      phone: address.phone,
      address: address.addressLine,
      addressLine: address.addressLine, // Keep both for compatibility
      cityId: address.cityId,
      cityName: address.cityName,
      provinceId: address.provinceId,
      provinceName: address.provinceName,
      districtId: address.districtId,
      districtName: address.districtName,
      postalCode: address.postalCode,
      country: address.country
    };

    // Ensure cart_id exists before placing order
    Promise.all([getCartId()]).then(() => {
      // dispatch addOrder with total override, shipping, discount, shippingInfo, shippingAddress, dan saveAddress
      addOrder('midtrans', total, shippingCost, discountAmount, shippingInfo, shippingAddressData, saveAddress);
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
                  {addressError && (
                    <div className='alert alert-danger'>
                      <strong>Error:</strong> {addressError}
                    </div>
                  )}
                  <div className='alert alert-info mb-3'>
                    <small><strong>Catatan:</strong> Semua field wajib diisi, termasuk Kecamatan (District) untuk menghitung biaya pengiriman.</small>
                  </div>
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
                    <Col md='6'>
                      <SelectOption
                        label='Kecamatan (Wajib)'
                        options={this.state.districts}
                        value={this.state.selectedDistrict}
                        handleSelectChange={this.handleDistrictChange}
                        disabled={this.state.loadingDistricts || !this.state.selectedCity}
                      />
                      {!this.state.selectedCity && (
                        <small className='text-muted'>Pilih kota terlebih dahulu</small>
                      )}
                    </Col>
                    <Col md='6'>
                      <Input label='Kode POS' name='postalCode' value={address.postalCode} onInputChange={this.handleAddressChange} />
                    </Col>
                    <Col md='12' className='mt-3'>
                      <div className='form-check'>
                        <input
                          className='form-check-input'
                          type='checkbox'
                          id='saveAddress'
                          checked={this.state.saveAddress}
                          onChange={(e) => this.setState({ saveAddress: e.target.checked })}
                        />
                        <label className='form-check-label' htmlFor='saveAddress'>
                          Simpan alamat ini untuk pemesanan berikutnya
                        </label>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3>Metode Pengiriman</h3>
                  {!this.state.address.districtId && (
                    <div className='alert alert-warning'>
                      <strong>Perhatian:</strong> Silakan pilih kecamatan (district) di langkah sebelumnya untuk melihat opsi pengiriman. API baru memerlukan district ID untuk menghitung biaya pengiriman.
                    </div>
                  )}
                  {this.state.loadingShipping && (
                    <div className='alert alert-info'>
                      <strong>Memuat...</strong> Sedang mengambil opsi pengiriman...
                    </div>
                  )}
                  {this.state.shippingError && (
                    <div className='alert alert-danger'>
                      <strong>Error:</strong> {this.state.shippingError}
                      {!this.state.originDistrictId && (
                        <div className='mt-2'>
                          <small>Origin district belum dikonfigurasi. Silakan set ORIGIN_DISTRICT_ID di environment variable server.</small>
                        </div>
                      )}
                    </div>
                  )}
                  {this.state.shippingOptions.length === 0 && this.state.address.districtId && !this.state.loadingShipping && !this.state.shippingError && (
                    <div className='alert alert-warning'>
                      <strong>Info:</strong> Tidak ada opsi pengiriman tersedia untuk rute ini. Pastikan district asal dan tujuan sudah benar.
                    </div>
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
                        <div className='price'>{formatIDR(option.price)}</div>
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
