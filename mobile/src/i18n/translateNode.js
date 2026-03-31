import React from 'react';

export function translateNode(node, t) {
  if (node === null || node === undefined || typeof node === 'boolean') return node;
  if (typeof node === 'string') return t(node);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, t));
  if (!React.isValidElement(node)) return node;

  const translatedChildren = React.Children.map(node.props?.children, (child) => translateNode(child, t));
  return React.cloneElement(node, { ...node.props }, translatedChildren);
}