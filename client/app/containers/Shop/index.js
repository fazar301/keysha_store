/**
 *
 * Shop
 *
 */

import React from 'react';

import { connect } from 'react-redux';
import { Switch, Route, withRouter } from 'react-router-dom';

import actions from '../../actions';
import { sortOptions } from '../../utils/store';

import ProductsShop from '../ProductsShop';
import BrandsShop from '../BrandsShop';
import CategoryShop from '../CategoryShop';

import Page404 from '../../components/Common/Page404';
import ProductFilter from '../../components/Store/ProductFilter';
import Pagination from '../../components/Common/Pagination';
import SelectOption from '../../components/Common/SelectOption';

class Shop extends React.PureComponent {
  componentDidMount() {
    document.body.classList.add('shop-page');
    this.props.fetchStoreCategories();
  }

  componentWillUnmount() {
    document.body.classList.remove('shop-page');
  }

  getCategoryTitle() {
    const { location, storeCategories } = this.props;
    const path = location.pathname;

    if (path === '/shop') {
      return 'All';
    }

    if (path.startsWith('/shop/category/')) {
      const slug = path.split('/shop/category/')[1];
      const category = storeCategories.find(cat => cat.slug === slug);
      return category ? category.name.toUpperCase() : 'Category';
    }

    if (path.startsWith('/shop/brand/')) {
      const slug = path.split('/shop/brand/')[1];
      return 'Brand';
    }

    return 'All';
  }

  render() {
    const { products, advancedFilters, filterProducts } = this.props;
    const { totalPages, currentPage, count, limit, order } = advancedFilters;
    const displayPagination = totalPages > 1;
    const totalProducts = products.length;
    const left = limit * (currentPage - 1) + 1;
    const right = totalProducts + left - 1;
    const categoryTitle = this.getCategoryTitle();

    return (
      <div className='shop'>
        {/* Category Header Section */}
        <div className='shop-category-header'>
          <div className='category-header-content'>
            <h1 className='category-title'>{categoryTitle}</h1>
          </div>
        </div>

        <div className='shop-content'>
          {/* Temporarily hidden filter sidebar */}
          {/* <div className='shop-sidebar'>
            <ProductFilter filterProducts={filterProducts} />
          </div> */}
          <div className='shop-main-content shop-main-content-full'>
            {/* Toolbar Section */}
            <div className='shop-toolbar'>
              <div className='d-flex align-items-center'>
                <span className='item-count'>{count} items</span>
              </div>
              <div className='d-flex align-items-center shop-sort-container' style={{ gap: '1rem' }}>
                <span className='sort-label d-none d-md-inline'>Sort</span>
                <div className='shop-sort-select'>
                  <SelectOption
                    name={'sorting'}
                    value={{ value: order, label: sortOptions[order].label }}
                    options={sortOptions}
                    handleSelectChange={(n, v) => {
                      filterProducts('sorting', n.value);
                    }}
                  />
                </div>
              </div>
            </div>
            <Switch>
              <Route exact path='/shop' component={ProductsShop} />
              <Route path='/shop/category/:slug' component={CategoryShop} />
              <Route path='/shop/brand/:slug' component={BrandsShop} />
              <Route path='*' component={Page404} />
            </Switch>

            {displayPagination && (
              <div className='d-flex justify-content-center text-center mt-4'>
                <Pagination
                  totalPages={totalPages}
                  onPagination={filterProducts}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    advancedFilters: state.product.advancedFilters,
    products: state.product.storeProducts,
    storeCategories: state.category.storeCategories
  };
};

export default connect(mapStateToProps, actions)(withRouter(Shop));
