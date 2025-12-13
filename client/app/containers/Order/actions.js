/*
 *
 * Order actions
 *
 */

import { push } from 'connected-react-router';
import axios from 'axios';
import { success } from 'react-notification-system-redux';

import {
  FETCH_ORDERS,
  FETCH_SEARCHED_ORDERS,
  FETCH_ORDER,
  UPDATE_ORDER_STATUS,
  SET_ORDERS_LOADING,
  SET_ADVANCED_FILTERS,
  CLEAR_ORDERS
} from './constants';

import { clearCart, getCartId } from '../Cart/actions';
import { toggleCart } from '../Navigation/actions';
import handleError from '../../utils/error';
import { API_URL } from '../../constants';

export const updateOrderStatus = value => {
  return {
    type: UPDATE_ORDER_STATUS,
    payload: value
  };
};

export const setOrderLoading = value => {
  return {
    type: SET_ORDERS_LOADING,
    payload: value
  };
};

export const fetchOrders = (page = 1) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.get(`${API_URL}/order`, {
        params: {
          page: page ?? 1,
          limit: 20
        }
      });

      const { orders, totalPages, currentPage, count } = response.data;

      dispatch({
        type: FETCH_ORDERS,
        payload: orders
      });

      dispatch({
        type: SET_ADVANCED_FILTERS,
        payload: { totalPages, currentPage, count }
      });
    } catch (error) {
      dispatch(clearOrders());
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

export const fetchAccountOrders = (page = 1) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.get(`${API_URL}/order/me`, {
        params: {
          page: page ?? 1,
          limit: 20
        }
      });

      const { orders, totalPages, currentPage, count } = response.data;

      dispatch({
        type: FETCH_ORDERS,
        payload: orders
      });

      dispatch({
        type: SET_ADVANCED_FILTERS,
        payload: { totalPages, currentPage, count }
      });
    } catch (error) {
      dispatch(clearOrders());
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

export const searchOrders = filter => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.get(`${API_URL}/order/search`, {
        params: {
          search: filter.value
        }
      });

      dispatch({
        type: FETCH_SEARCHED_ORDERS,
        payload: response.data.orders
      });
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

export const fetchOrder = (id, withLoading = true) => {
  return async (dispatch, getState) => {
    try {
      if (withLoading) {
        dispatch(setOrderLoading(true));
      }

      const response = await axios.get(`${API_URL}/order/${id}`);

      dispatch({
        type: FETCH_ORDER,
        payload: response.data.order
      });
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      if (withLoading) {
        dispatch(setOrderLoading(false));
      }
    }
  };
};

export const cancelOrder = () => {
  return async (dispatch, getState) => {
    try {
      const order = getState().order.order;

      await axios.delete(`${API_URL}/order/cancel/${order._id}`);

      dispatch(push(`/dashboard/orders`));
    } catch (error) {
      handleError(error, dispatch);
    }
  };
};

export const updateOrderItemStatus = (itemId, status) => {
  return async (dispatch, getState) => {
    try {
      const order = getState().order.order;

      const response = await axios.put(
        `${API_URL}/order/status/item/${itemId}`,
        {
          orderId: order._id,
          cartId: order.cartId,
          status
        }
      );

      if (response.data.orderCancelled) {
        dispatch(push(`/dashboard/orders`));
      } else {
        dispatch(updateOrderStatus({ itemId, status }));
        dispatch(fetchOrder(order._id, false));
      }

      const successfulOptions = {
        title: `${response.data.message}`,
        position: 'tr',
        autoDismiss: 1
      };

      dispatch(success(successfulOptions));
    } catch (error) {
      handleError(error, dispatch);
    }
  };
};

export const addOrder = (paymentMethod = 'midtrans', totalOverride = null, shippingCost = 0, discountAmount = 0, shippingInfo = null, shippingAddress = null, saveAddress = false) => {
  return async (dispatch, getState) => {
    try {
      const cartId = localStorage.getItem('cart_id');
      const total = totalOverride !== null ? totalOverride : getState().cart.cartTotal;

      console.log('addOrder - cartId:', cartId, 'total:', total, 'paymentMethod:', paymentMethod, 'shipping:', shippingCost, 'discount:', discountAmount, 'shippingInfo:', shippingInfo, 'shippingAddress:', shippingAddress, 'saveAddress:', saveAddress);

      if (!cartId) {
        console.error('No cartId found in localStorage');
        handleError({ message: 'Cart ID not found. Please try again.' }, dispatch);
        return;
      }

      const response = await axios.post(`${API_URL}/order/add`, {
        cartId,
        total,
        paymentMethod,
        shippingCost,
        discountAmount,
        shippingInfo: shippingInfo || null, // { courier, service, cost }
        shippingAddress: shippingAddress || null, // Address information from checkout
        saveAddress: saveAddress || false // Whether to save address as default
      });

      console.log('Order created response:', response.data);

      // If Midtrans data returned, trigger Snap payment flow (prefer token, fallback to redirect_url)
      const hasMidtrans = response.data.midtrans;
      const token = hasMidtrans && response.data.midtrans.token;
      const redirectUrl = hasMidtrans && response.data.midtrans.redirect_url;

      if (token) {
        console.log('Midtrans token received, initiating payment...');
        const clientKey = response.data.midtrans.clientKey || '';
        const scriptId = 'midtrans-snap-js';
        const snapUrl = window.location.host.indexOf('localhost') >= 0
          ? 'https://app.sandbox.midtrans.com/snap/snap.js'
          : 'https://app.midtrans.com/snap/snap.js';

        const runSnap = () => {
          console.log('Running Snap with token:', token);
          if (window.snap && window.snap.pay) {
            window.snap.pay(token, {
              onSuccess: function (result) {
                console.log('Payment success:', result);
                dispatch(push(`/order/success/${response.data.order._id}`));
                dispatch(clearCart());
              },
              onPending: function (result) {
                console.log('Payment pending:', result);
                dispatch(push(`/order/success/${response.data.order._id}`));
                dispatch(clearCart());
              },
              onError: function (err) {
                console.error('Payment error:', err);
                dispatch(push(`/order/${response.data.order._id}`));
              },
              onClose: function () {
                console.log('User closed payment widget');
              }
            });
          } else {
            console.error('window.snap not available');
            dispatch(push(`/order/${response.data.order._id}`));
          }
        };

        let script = document.getElementById(scriptId);
        if (!script) {
          console.log('Loading Midtrans Snap script from:', snapUrl);
          script = document.createElement('script');
          script.id = scriptId;
          script.src = snapUrl;
          script.setAttribute('data-client-key', clientKey);
          script.onload = () => {
            console.log('Snap script loaded successfully');
            runSnap();
          };
          script.onerror = () => {
            console.error('Failed to load Snap script');
            dispatch(push(`/order/${response.data.order._id}`));
          };
          document.body.appendChild(script);
        } else {
          console.log('Snap script already loaded, using existing');
          script.setAttribute('data-client-key', clientKey);
          runSnap();
        }
      } else if (redirectUrl) {
        console.log('Midtrans redirect_url found, redirecting to Snap page');
        window.location.href = redirectUrl;
      } else {
        console.error('No Midtrans token or redirect_url returned');
        handleError({ message: 'Payment session unavailable. Please try again.' }, dispatch);
      }
    } catch (error) {
      console.error('addOrder error:', error);
      handleError(error, dispatch);
    }
  };
};

export const placeOrder = () => {
  return (dispatch, getState) => {
    console.log('placeOrder called');
    const token = localStorage.getItem('token');
    const cartItems = getState().cart.cartItems;

    console.log('Token exists:', !!token, 'Cart items length:', cartItems?.length);

    if (token && cartItems && cartItems.length > 0) {
      console.log('Proceeding with order placement, getting cart ID...');
      Promise.all([dispatch(getCartId())]).then(() => {
        console.log('Cart ID obtained, calling addOrder...');
        dispatch(addOrder());
      }).catch(err => {
        console.error('Error getting cart ID:', err);
      });
    } else {
      console.warn('Cannot place order - token or cartItems missing');
    }

    dispatch(toggleCart());
  };
};

export const clearOrders = () => {
  return {
    type: CLEAR_ORDERS
  };
};

// Generate label order untuk mendapatkan AWB
export const generateLabel = (orderId, destinationInfo = {}) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.post(`${API_URL}/order/${orderId}/generate-label`, destinationInfo);

      if (response.data.success) {
        // Refresh order untuk mendapatkan AWB terbaru
        dispatch(fetchOrder(orderId, false));

        const successfulOptions = {
          title: 'Label berhasil dibuat!',
          message: `Nomor resi: ${response.data.data.airwayBill}`,
          position: 'tr',
          autoDismiss: 2
        };

        dispatch(success(successfulOptions));
      } else {
        handleError({ message: response.data.error || 'Gagal membuat label' }, dispatch);
      }
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

// Retry generate label
export const retryLabel = (orderId) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.post(`${API_URL}/order/${orderId}/retry-label`);

      if (response.data.success) {
        // Refresh order untuk mendapatkan AWB terbaru
        dispatch(fetchOrder(orderId, false));

        const successfulOptions = {
          title: 'Label berhasil dibuat!',
          message: `Nomor resi: ${response.data.data.airwayBill}`,
          position: 'tr',
          autoDismiss: 2
        };

        dispatch(success(successfulOptions));
      } else {
        handleError({ message: response.data.error || 'Gagal membuat label' }, dispatch);
      }
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};
