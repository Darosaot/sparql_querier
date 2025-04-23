import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDashboardByShareToken } from '../utils/dashboardUtils';

function SharedDashboard() {
  const { shareToken } = useParams();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (shareToken) {
      const foundDashboard = getDashboardByShareToken(shareToken);
      setDashboard(foundDashboard);
    }
  }, [shareToken]);

    return (
    <div>
      {dashboard ? (
        <h1>{dashboard.name}</h1>
      ) : (
        <p>Dashboard not found</p>
      )}
    </div>
  );
}

export default SharedDashboard;