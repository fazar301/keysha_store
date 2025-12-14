/*
 *
 * Statistics reducer
 *
 */

import {
    FETCH_STATISTICS,
    SET_STATISTICS_LOADING,
    CLEAR_STATISTICS
} from './constants';

const initialState = {
    statistics: {
        totals: {
            orders: 0,
            revenue: 0,
            users: 0,
            products: 0
        },
        ordersByStatus: {},
        revenueByMonth: [],
        ordersByMonth: [],
        recentOrders: []
    },
    isLoading: false
};

const statisticsReducer = (state = initialState, action) => {
    switch (action.type) {
        case FETCH_STATISTICS:
            return {
                ...state,
                statistics: action.payload
            };
        case SET_STATISTICS_LOADING:
            return {
                ...state,
                isLoading: action.payload
            };
        case CLEAR_STATISTICS:
            return {
                ...initialState
            };
        default:
            return state;
    }
};

export default statisticsReducer;

