const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertTenantStoragePath(path: string, garageId: string, vehicleId: string): void {
  if (!uuid.test(garageId) || !uuid.test(vehicleId)) throw new Error("MEDIA_TARGET_ID_INVALID");
  const prefix = `${garageId}/${vehicleId}/`;
  if (
    path.trim() !== path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("%") ||
    path.includes("//") ||
    path.split("/").some((segment) => segment === "." || segment === "..") ||
    !path.startsWith(prefix) ||
    path.length <= prefix.length
  ) {
    throw new Error("MEDIA_TARGET_PATH_CROSS_TENANT");
  }
}
