/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  goatcounter?: {
    count: (variables: {
      path: string;
      event: boolean;
      no_session: boolean;
    }) => void;
  };
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module 'gifsicle-wasm-browser' {
  interface GifsicleInput {
    file: string | File | Blob | ArrayBuffer;
    name: string;
  }
  interface GifsicleRunOptions {
    input: GifsicleInput[];
    command: string[];
    folder?: string[];
    isStrict?: boolean;
  }
  const gifsicle: {
    run(options: GifsicleRunOptions): Promise<File[]>;
  };
  export default gifsicle;
}
