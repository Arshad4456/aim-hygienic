import React from 'react';
import { Text, TextInput } from 'react-native';

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
  if (installed) return;
  installed = true;

  const originalCreateElement = React.createElement;
  React.createElement = function patchedCreateElement(type, props, ...children) {
    let nextProps = props;
    let nextChildren = children;

    const isTextComponent = type === Text || type?.displayName === 'Text' || type?.name === 'Text';
    const isTextInputComponent = type === TextInput || type?.displayName === 'TextInput' || type?.name === 'TextInput';

    if (isTextComponent) {
      nextChildren = children.map((child) => translateChild(child));
    }

    if (isTextInputComponent && typeof props?.placeholder === 'string') {
      nextProps = { ...props, placeholder: runtimeTranslator(props.placeholder) };
    }

    return originalCreateElement(type, nextProps, ...nextChildren);
  };
}
