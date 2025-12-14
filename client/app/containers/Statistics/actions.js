/*
 *
 * Statistics actions
 *
 */

import axios from 'axios';

import {
    FETCH_STATISTICS,
    SET_STATISTICS_LOADING,
    CLEAR_STATISTICS
} from './constants';

import handleError from '../../utils/error';
import { API_URL } from '../../constants';

export const setStatisticsLoading = value => {
    return {
        type: SET_STATISTICS_LOADING,
        payload: value
    };
};

export const fetchStatistics = (months = 12) => {
    return async (dispatch, getState) => {
        try {
            dispatch(setStatisticsLoading(true));

            const response = await axios.get(`${API_URL}/statistics`, {
                params: {
                    months
                }
            });

            dispatch({
                type: FETCH_STATISTICS,
                payload: response.data.statistics
            });
        } catch (error) {
            handleError(error, dispatch);
        } finally {
            dispatch(setStatisticsLoading(false));
        }
    };
};

export const clearStatistics = () => {
    return {
        type: CLEAR_STATISTICS
    };
};

