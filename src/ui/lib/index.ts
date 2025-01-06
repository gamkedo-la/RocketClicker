/*
  createElement

  This is the runtime for JSX. It is used by esbuild to transform JSX into calls.
  It must exists as a separated file as it is hardcoded import in esbuild

  https://esbuild.github.io/api/#jsx-import-source
*/

export function createElement(type: string, props: any, ...children: any[]) {
  return { type, props: props || {}, children };
}
