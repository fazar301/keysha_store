/**
 *
 * ProductPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col } from 'reactstrap';
import { Link } from 'react-router-dom';

import actions from '../../actions';

import Input from '../../components/Common/Input';
import SelectOption from '../../components/Common/SelectOption';
import Button from '../../components/Common/Button';
import LoadingIndicator from '../../components/Common/LoadingIndicator';
import NotFound from '../../components/Common/NotFound';
import { BagIcon } from '../../components/Common/Icon';
import ProductReviews from '../../components/Store/ProductReviews';
import SocialShare from '../../components/Store/SocialShare';
import VirtualTryOn from '../../components/Store/VirtualTryOn';
import { formatIDR } from '../../utils';

class ProductPage extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      selectedImageIndex: 0
    };
  }

  componentDidMount() {
    const slug = this.props.match.params.slug;
    this.props.fetchStoreProduct(slug);
    this.props.fetchProductReviews(slug);
    document.body.classList.add('product-page');
  }

  componentDidUpdate(prevProps) {
    if (this.props.match.params.slug !== prevProps.match.params.slug) {
      const slug = this.props.match.params.slug;
      this.props.fetchStoreProduct(slug);
      this.setState({ selectedImageIndex: 0 });
    }
  }

  componentWillUnmount() {
    document.body.classList.remove('product-page');
  }

  handleQuantityChange = (delta) => {
    const { productShopData, product, productShopChange } = this.props;
    const newQuantity = Math.max(1, Math.min(product.inventory || 1, productShopData.quantity + delta));
    productShopChange('quantity', newQuantity);
  };

  handleSizeSelect = (size) => {
    const { productShopChange } = this.props;
    productShopChange('selectedSize', size);
  };

  render() {
    const {
      isLoading,
      product,
      productShopData,
      shopFormErrors,
      itemInCart,
      productShopChange,
      handleAddToCart,
      handleRemoveFromCart,
      addProductReview,
      reviewsSummary,
      reviews,
      reviewFormData,
      reviewChange,
      reviewFormErrors
    } = this.props;

    // Check if product has discount (originalPrice > price)
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

    // Get product images (support multiple images if available)
    const productImages = product.images && product.images.length > 0 
      ? product.images 
      : product.imageUrl 
        ? [product.imageUrl] 
        : ['/images/placeholder-image.png'];

    return (
      <div className='product-shop'>
        {isLoading ? (
          <LoadingIndicator />
        ) : Object.keys(product).length > 0 ? (
          <>
            <Row className='flex-row product-main-row'>
              <Col xs='12' sm='12' md='6' lg='6' className='product-image-col'>
                <div className='product-image-gallery'>
                  <div className='product-image-main'>
                    <img
                      className='item-image'
                      src={productImages[this.state.selectedImageIndex]}
                      alt={product.name}
                    />
                    {product.inventory <= 0 && !shopFormErrors['quantity'] && (
                      <div className='stock-badge out-of-stock'>Out of stock</div>
                    )}
                    <VirtualTryOn product={product} />
                  </div>
                  {productImages.length > 1 && (
                    <div className='product-image-thumbnails'>
                      {productImages.map((image, index) => (
                        <button
                          key={index}
                          className={`thumbnail-btn ${this.state.selectedImageIndex === index ? 'active' : ''}`}
                          onClick={() => this.setState({ selectedImageIndex: index })}
                        >
                          <img src={image} alt={`${product.name} ${index + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Col>
              <Col xs='12' sm='12' md='6' lg='6' className='product-details-col'>
                <div className='product-details-container'>
                  <h1 className='product-title'>{product.name}</h1>
                  
                  <div className='product-price-section'>
                    {hasDiscount ? (
                      <>
                        <span className='product-price-current'>{formatIDR(product.price)}</span>
                        <span className='product-price-original'>{formatIDR(product.originalPrice)}</span>
                        {discountPercent > 0 && (
                          <span className='product-discount-badge'>-{discountPercent}%</span>
                        )}
                      </>
                    ) : (
                      <span className='product-price-current'>{formatIDR(product.price)}</span>
                    )}
                  </div>

                  {product.sizes && product.sizes.length > 0 && (
                    <div className='product-size-section'>
                      <label className='size-label'>Ukuran</label>
                      <div className='size-options'>
                        {product.sizes.map((size, index) => {
                          const sizeValue = size.value || size;
                          const sizeLabel = size.label || size;
                          const isSelected = productShopData.selectedSize?.value === sizeValue || 
                                           productShopData.selectedSize === sizeValue;
                          return (
                            <button
                              key={index}
                              className={`size-option ${isSelected ? 'selected' : ''} ${shopFormErrors['selectedSize'] ? 'error' : ''}`}
                              onClick={() => this.handleSizeSelect(size)}
                              disabled={product.inventory <= 0}
                            >
                              {sizeLabel}
                            </button>
                          );
                        })}
                      </div>
                      {shopFormErrors['selectedSize'] && (
                        <span className='error-message'>{shopFormErrors['selectedSize']}</span>
                      )}
                    </div>
                  )}

                  <div className='product-quantity-section'>
                    <label className='quantity-label'>Jumlah</label>
                    <div className='quantity-controls'>
                      <button
                        className='quantity-btn decrease'
                        onClick={() => this.handleQuantityChange(-1)}
                        disabled={productShopData.quantity <= 1 || product.inventory <= 0}
                      >
                        −
                      </button>
                      <input
                        type='number'
                        className='quantity-input'
                        value={productShopData.quantity}
                        min={1}
                        max={product.inventory || 1}
                        readOnly
                      />
                      <button
                        className='quantity-btn increase'
                        onClick={() => this.handleQuantityChange(1)}
                        disabled={productShopData.quantity >= (product.inventory || 1) || product.inventory <= 0}
                      >
                        +
                      </button>
                    </div>
                    {shopFormErrors['quantity'] && (
                      <span className='error-message'>{shopFormErrors['quantity']}</span>
                    )}
                  </div>

                  <div className='product-actions'>
                    {itemInCart ? (
                      <Button
                        variant='primary'
                        disabled={product.inventory <= 0 && !shopFormErrors['quantity']}
                        text='Hapus dari Keranjang'
                        className='add-to-cart-btn remove'
                        onClick={() => handleRemoveFromCart(product)}
                      />
                    ) : (
                      <Button
                        variant='primary'
                        disabled={product.inventory <= 0 && !shopFormErrors['quantity']}
                        text='Tambah ke Keranjang'
                        className='add-to-cart-btn'
                        onClick={() =>
                          handleAddToCart({
                            ...product,
                            selectedSize: productShopData.selectedSize
                          })
                        }
                      />
                    )}
                  </div>

                  {product.description && (
                    <div className='product-description-section'>
                      <h3 className='description-title'>Deskripsi</h3>
                      <div className='product-description' dangerouslySetInnerHTML={{ __html: product.description }} />
                    </div>
                  )}

                  {product.brand && (
                    <div className='product-brand-section'>
                      <p className='brand-link'>
                        Lihat lebih banyak dari{' '}
                        <Link to={`/shop/brand/${product.brand.slug}`}>
                          {product.brand.name}
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
            <ProductReviews
              reviewFormData={reviewFormData}
              reviewFormErrors={reviewFormErrors}
              reviews={reviews}
              reviewsSummary={reviewsSummary}
              reviewChange={reviewChange}
              addReview={addProductReview}
            />
          </>
        ) : (
          <NotFound message='No product found.' />
        )}
      </div>
    );
  }
}

const mapStateToProps = state => {
  const itemInCart = state.cart.cartItems.find(
    item => item._id === state.product.storeProduct._id
  )
    ? true
    : false;

  return {
    product: state.product.storeProduct,
    productShopData: state.product.productShopData,
    shopFormErrors: state.product.shopFormErrors,
    isLoading: state.product.isLoading,
    reviews: state.review.productReviews,
    reviewsSummary: state.review.reviewsSummary,
    reviewFormData: state.review.reviewFormData,
    reviewFormErrors: state.review.reviewFormErrors,
    itemInCart
  };
};

export default connect(mapStateToProps, actions)(ProductPage);
