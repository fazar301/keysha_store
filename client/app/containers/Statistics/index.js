/*
 *
 * Statistics
 *
 */

import React from 'react';

import { connect } from 'react-redux';

import actions from '../../actions';
import StatisticsComponent from './Statistics';

class Statistics extends React.PureComponent {
    componentDidMount() {
        this.props.fetchStatistics(12);
    }

    render() {
        const { statistics, isLoading } = this.props;

        return (
            <StatisticsComponent
                statistics={statistics}
                isLoading={isLoading}
                fetchStatistics={this.props.fetchStatistics}
            />
        );
    }
}

const mapStateToProps = state => {
    return {
        statistics: state.statistics.statistics,
        isLoading: state.statistics.isLoading
    };
};

export default connect(mapStateToProps, actions)(Statistics);

