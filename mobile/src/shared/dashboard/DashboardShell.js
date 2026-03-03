import React from 'react';
import Screen from '../components/Screen';

export default function DashboardShell({ title, children }) {
  return <Screen title={title}>{children}</Screen>;
}
