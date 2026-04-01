import React from 'react';
import CommandCenterScreen from './CommandCenterScreen';

export default function ReportsCenterScreen({ variant = 'admin' }) {
  return <CommandCenterScreen role={variant === 'distributor' ? 'distributor' : 'admin'} />;
}
