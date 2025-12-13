/**
 *
 * Homepage
 *
 */

import React from 'react';

import { connect } from 'react-redux';
import { Container } from 'reactstrap';

import actions from '../../actions';
import banners from './banners.json';
import CarouselSlider from '../../components/Common/CarouselSlider';
import { responsiveOneItemCarousel } from '../../components/Common/CarouselSlider/utils';
import ProductList from '../../components/Store/ProductList';
import LoadingIndicator from '../../components/Common/LoadingIndicator';

class Homepage extends React.PureComponent {
  componentDidMount() {
    this.props.fetchNewArrivals(12);
    // Try to fetch accessories, if category doesn't exist it will return empty array
    this.props.fetchAccessories('accessories', 12);
  }

  render() {
    const {
      newArrivals,
      accessories,
      isLoading,
      authenticated,
      updateWishlist
    } = this.props;

    return (
      <div className='homepage'>
        {/* Full-width Carousel */}
        <div className='homepage-carousel-wrapper'>
          <div className='homepage-carousel'>
            <CarouselSlider
              swipeable={true}
              showDots={true}
              infinite={true}
              autoPlay={true}
              autoPlaySpeed={5000}
              slides={banners}
              responsive={responsiveOneItemCarousel}
            >
              {banners.map((item, index) => (
                <div key={index} className='carousel-slide'>
                  <img
                    src={item.imageUrl}
                    alt={item.title || `Banner ${index + 1}`}
                    className='carousel-image'
                  />
                </div>
              ))}
            </CarouselSlider>
          </div>
        </div>

        <Container>
          {/* New Arrivals Section */}
          <div className='homepage-section'>
            <div className='section-header'>
              <h2 className='section-title'>New Arrivals</h2>
            </div>
            {isLoading && newArrivals.length === 0 ? (
              <LoadingIndicator />
            ) : (
              <>
                {newArrivals && newArrivals.length > 0 ? (
                  <ProductList
                    products={newArrivals}
                    authenticated={authenticated}
                    updateWishlist={updateWishlist}
                  />
                ) : (
                  <p className='text-center py-5'>No new arrivals available.</p>
                )}
              </>
            )}
          </div>

          {/* Accessories Section */}
          {accessories && accessories.length > 0 && (
            <div className='homepage-section'>
              <div className='section-header'>
                <h2 className='section-title'>Accessories</h2>
              </div>
              <ProductList
                products={accessories}
                authenticated={authenticated}
                updateWishlist={updateWishlist}
              />
            </div>
          )}
        </Container>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    newArrivals: state.homepage.newArrivals,
    accessories: state.homepage.accessories,
    isLoading: state.homepage.isLoading,
    authenticated: state.authentication.authenticated
  };
};

export default connect(mapStateToProps, actions)(Homepage);
