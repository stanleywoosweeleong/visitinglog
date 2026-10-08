export function signInRedirect(href, base = './') {
  const url = new URL(base, href);
  url.search = '';
  url.hash = '';
  return url.href;
}
