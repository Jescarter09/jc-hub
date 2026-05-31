declare module 'react' {
  const React: {
    StrictMode: (props: { children?: unknown }) => unknown;
  };
  export default React;
}

declare module 'react-dom/client' {
  export function createRoot(element: Element): {
    render(children: unknown): void;
  };
}

declare module '*.jsx' {
  const Component: unknown;
  export default Component;
}

declare module 'react/jsx-runtime' {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: unknown;
  }
}
