
import React from 'react';
import { Navigate } from 'react-router-dom';

// This component is deprecated and has been replaced by EmailAppearancePage.
// Redirecting to the new settings page to ensure no broken links.
const CrmPage: React.FC = () => {
    return <Navigate to="/settings/email-appearance" replace />;
};

export default CrmPage;
