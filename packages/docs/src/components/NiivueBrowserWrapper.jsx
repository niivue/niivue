import BrowserOnly from "@docusaurus/BrowserOnly";

export const NiivueBrowserWrapper = ({children}) => (
  <BrowserOnly fallback={<div>Loading...</div>}>
    {() => {
      return (
        children
      )
    }}
  </BrowserOnly>
);