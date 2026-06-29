function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getExternalApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return configured ? trimTrailingSlash(configured) : "";
}

export function withApiBase(path: string) {
  const baseUrl = getExternalApiBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
}
