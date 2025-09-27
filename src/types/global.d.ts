/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="react" />
/// <reference types="react-dom" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
  
  type Element = React.ReactElement<React.ComponentProps<React.ComponentType>, React.ComponentType>;
  
  interface ElementClass extends React.Component<Record<string, unknown>> {
    render(): React.ReactNode;
  }
  
  interface ElementAttributesProperty { 
    props: Record<string, unknown>; 
  }
  interface ElementChildrenAttribute { 
    children: Record<string, unknown>; 
  }
}
