/*
 *
 * Homepage reducer
 *
 */

import {
  DEFAULT_ACTION,
  FETCH_NEW_ARRIVALS,
  FETCH_ACCESSORIES,
  SET_HOMEPAGE_LOADING
} from './constants';

const initialState = {
  newArrivals: [],
  accessories: [],
  isLoading: false
};

const homepageReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_NEW_ARRIVALS:
      return {
        ...state,
        newArrivals: action.payload
      };
    case FETCH_ACCESSORIES:
      return {
        ...state,
        accessories: action.payload
      };
    case SET_HOMEPAGE_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    case DEFAULT_ACTION:
      return state;
    default:
      return state;
  }
};

export default homepageReducer;
