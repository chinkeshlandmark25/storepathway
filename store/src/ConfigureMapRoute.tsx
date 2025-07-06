import React from 'react';
import ConfigureMap from './components/ConfigureMap';

const ConfigureMapRoute: React.FC<{ token: string }> = ({ token }) => {
  return <ConfigureMap token={token} />;
};

export default ConfigureMapRoute;
