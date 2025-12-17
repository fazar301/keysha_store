/**
 *
 * MiniBrand
 *
 */

import React from 'react';

import { Link } from 'react-router-dom';

const MiniBrand = props => {
  const { brands, toggleBrand } = props;

  const handleMenuItemClick = () => {
    toggleBrand();
  };

  return (
    <div className='mini-brand-list'>
      <div className='d-flex align-items-center justify-content-between min-brand-title'>
        <h3 className='mb-0 text-uppercase'>Belanja Berdasarkan Merek</h3>
        <Link
          to={'/brands'}
          className='redirect-link'
          role='menuitem'
          onClick={handleMenuItemClick}
        >
          Lihat semua
        </Link>
      </div>
      <div className='mini-brand-block'>
        {brands.map((brand, index) => (
          <div key={index} className='brand-item'>
            <Link
              to={`/shop/brand/${brand.slug}`}
              className='brand-link'
              role='menuitem'
              onClick={handleMenuItemClick}
            >
              {brand.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniBrand;
