/*
 *
 * Homepage actions
 *
 */

import axios from 'axios';
import {
  DEFAULT_ACTION,
  FETCH_NEW_ARRIVALS,
  FETCH_ACCESSORIES,
  SET_HOMEPAGE_LOADING
} from './constants';
import { API_URL } from '../../constants';
import handleError from '../../utils/error';

export const defaultAction = () => {
  return {
    type: DEFAULT_ACTION
  };
};

export const setHomepageLoading = value => {
  return {
    type: SET_HOMEPAGE_LOADING,
    payload: value
  };
};

// Fetch new arrivals (from "new arrival" category or latest products)
export const fetchNewArrivals = (limit = 12) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setHomepageLoading(true));
      const sortOrder = { _id: -1 }; // Sort by newest first

      // Try to fetch from "new arrival" category first (slug: "new-arrival")
      let response;
      try {
        response = await axios.get(`${API_URL}/product/list`, {
          params: {
            sortOrder: JSON.stringify(sortOrder),
            page: 1,
            limit: limit,
            category: 'new-arrival', // Slug format (mongoose-slug-generator converts "new arrival" to "new-arrival")
            brand: 'all'
          }
        });

        // If no products found, fallback to latest products
        if (!response.data.products || response.data.products.length === 0) {
          response = await axios.get(`${API_URL}/product/list`, {
            params: {
              sortOrder: JSON.stringify(sortOrder),
              page: 1,
              limit: limit,
              category: 'all', // Fallback to all products sorted by newest
              brand: 'all'
            }
          });
        }
      } catch (err) {
        // If category doesn't exist, fallback to latest products
        response = await axios.get(`${API_URL}/product/list`, {
          params: {
            sortOrder: JSON.stringify(sortOrder),
            page: 1,
            limit: limit,
            category: 'all',
            brand: 'all'
          }
        });
      }

      dispatch({
        type: FETCH_NEW_ARRIVALS,
        payload: response.data.products || []
      });
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      dispatch(setHomepageLoading(false));
    }
  };
};

// Fetch accessories products by category
export const fetchAccessories = (categorySlug = 'accessories', limit = 12) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setHomepageLoading(true));
      const sortOrder = { _id: -1 };
      const response = await axios.get(`${API_URL}/product/list`, {
        params: {
          sortOrder: JSON.stringify(sortOrder),
          page: 1,
          limit: limit,
          category: categorySlug,
          brand: 'all'
        }
      });

      dispatch({
        type: FETCH_ACCESSORIES,
        payload: response.data.products || []
      });
    } catch (error) {
      handleError(error, dispatch);
      // If category doesn't exist, set empty array
      dispatch({
        type: FETCH_ACCESSORIES,
        payload: []
      });
    } finally {
      dispatch(setHomepageLoading(false));
    }
  };
};
