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

  try {
    // Support React automatic JSX runtime used by modern React Native builds.
    const JSXRuntime = require('react/jsx-runtime');
    if (JSXRuntime?.jsx) {
      const originalJsx = JSXRuntime.jsx;
      JSXRuntime.jsx = function patchedJsx(type, props, key) {
        const isTextComponent = type === Text || type?.displayName === 'Text' || type?.name === 'Text';
        const isTextInputComponent = type === TextInput || type?.displayName === 'TextInput' || type?.name === 'TextInput';
        let nextProps = props;

        if (isTextComponent && props && 'children' in props) {
          nextProps = { ...nextProps, children: translateChild(props.children) };
        }

        if (isTextInputComponent && typeof props?.placeholder === 'string') {
          nextProps = { ...nextProps, placeholder: runtimeTranslator(props.placeholder) };
        }

        return originalJsx(type, nextProps, key);
      };
    }

    if (JSXRuntime?.jsxs) {
      const originalJsxs = JSXRuntime.jsxs;
      JSXRuntime.jsxs = function patchedJsxs(type, props, key) {
        const isTextComponent = type === Text || type?.displayName === 'Text' || type?.name === 'Text';
        const isTextInputComponent = type === TextInput || type?.displayName === 'TextInput' || type?.name === 'TextInput';
        let nextProps = props;

        if (isTextComponent && props && 'children' in props) {
          nextProps = { ...nextProps, children: translateChild(props.children) };
        }

        if (isTextInputComponent && typeof props?.placeholder === 'string') {
          nextProps = { ...nextProps, placeholder: runtimeTranslator(props.placeholder) };
        }

        return originalJsxs(type, nextProps, key);
      };
    }
  } catch (_error) {
    // If jsx-runtime patching is not available, continue with fallback patches below.
  }

  if (typeof Text?.render === 'function') {
    const originalTextRender = Text.render;
    Text.render = function patchedTextRender(...args) {
      const rendered = originalTextRender.call(this, ...args);
      if (!rendered?.props) return rendered;
      const translatedChildren = translateChild(rendered.props.children);
      if (translatedChildren === rendered.props.children) return rendered;
      return React.cloneElement(rendered, { ...rendered.props }, translatedChildren);
    };
  }

  if (typeof TextInput?.render === 'function') {
    const originalInputRender = TextInput.render;
    TextInput.render = function patchedInputRender(...args) {
      const rendered = originalInputRender.call(this, ...args);
      if (!rendered?.props || typeof rendered.props.placeholder !== 'string') return rendered;
      const translatedPlaceholder = runtimeTranslator(rendered.props.placeholder);
      if (translatedPlaceholder === rendered.props.placeholder) return rendered;
      return React.cloneElement(rendered, { ...rendered.props, placeholder: translatedPlaceholder });
    };
  }

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
