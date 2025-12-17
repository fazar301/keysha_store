/**
 *
 * ProductList
 *
 */

import React from 'react';

import { Link } from 'react-router-dom';

import AddToWishList from '../AddToWishList';
import { formatIDR } from '../../../utils';

const ProductList = props => {
  const { products, updateWishlist, authenticated } = props;

  // Helper function to remove "Faith Industries" from product name
  const cleanProductName = (name) => {
    if (!name) return '';
    return name.replace(/^Faith Industries\s*["']?/i, '').replace(/^["']/, '').trim();
  };

  return (
    <div className='product-list'>
      {products.map((product, index) => (
        <div key={index} className='mb-3 mb-md-0'>
          <div className='product-container'>
            <div className='item-box'>
              <div className='add-wishlist-box'>
                <AddToWishList
                  id={product._id}
                  liked={product?.isLiked ?? false}
                  enabled={authenticated}
                  updateWishlist={updateWishlist}
                  authenticated={authenticated}
                />
              </div>

              <div className='item-link'>
                <Link
                  to={`/product/${product.slug}`}
                  className='d-flex flex-column h-100'
                >
                  <div className='item-image-container'>
                    <div className='item-image-box'>
                      <img
                        className='item-image'
                        src={`${product.imageUrl
                          ? product.imageUrl
                          : '/images/placeholder-image.png'
                          }`}
                      />
                    </div>
                  </div>
                  <div className='item-body'>
                    <div className='item-details p-3'>
                      <h1 className='item-name'>{cleanProductName(product.name)}</h1>
                      {product.brand && Object.keys(product.brand).length > 0 && (
                        <p className='by'>
                          By <span>{product.brand.name}</span>
                        </p>
                      )}
                      <p className='item-desc mb-0'>{product.description}</p>
                    </div>
                  </div>
                  <div className='item-footer'>
                    <div className='d-flex flex-row justify-content-between align-items-center mb-2'>
                      <p className='price mb-0'>{formatIDR(product.price)}</p>
                      {product.totalReviews > 0 && (
                        <div className='d-flex align-items-center'>
                          <span className='mr-1' style={{ fontSize: '14px', fontWeight: 500 }}>
                            {parseFloat(product?.averageRating).toFixed(1)}
                          </span>
                          <span
                            className={`fa fa-star ${product.totalReviews !== 0 ? 'checked' : ''
                              }`}
                            style={{ color: '#ffb302', fontSize: '14px' }}
                          ></span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
