import React from 'react';
import { Text } from 'react-native';

let installed = false;
let runtimeTranslator = (value) => value;

function translateChild(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return node;
  if (typeof node === 'string') return runtimeTranslator(node);
  if (Array.isArray(node)) return node.map((child) => translateChild(child));
  if (!React.isValidElement(node)) return node;

  const translatedChildren = React.Children.map(node.props?.children, (child) => translateChild(child));
  return React.cloneElement(node, { ...node.props }, translatedChildren);
}

export function setRuntimeTranslator(translator) {
  runtimeTranslator = typeof translator === 'function' ? translator : ((value) => value);
}

export function installGlobalTextTranslator() {
  if (installed || typeof Text?.render !== 'function') return;
  installed = true;

  const originalRender = Text.render;
  Text.render = function patchedTextRender(...args) {
    const rendered = originalRender.call(this, ...args);
    if (!rendered?.props) return rendered;
    const translatedChildren = translateChild(rendered.props.children);
    if (translatedChildren === rendered.props.children) return rendered;
    return React.cloneElement(rendered, { ...rendered.props }, translatedChildren);
  };
}