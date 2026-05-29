// svg.d.ts
// @svgr/webpack (configured in next.config.ts) transforms every .svg import
// into a React component. The default export is the component, not a URL string.
declare module "*.svg" {
  import * as React from "react";
  const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default ReactComponent;
}
