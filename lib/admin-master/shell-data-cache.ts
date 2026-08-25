import { unstable_cache } from "next/cache";
import { getAdminMasterShellData } from "@/lib/admin-master/data";

const getCachedShellData = unstable_cache(
  async () => getAdminMasterShellData(),
  ["admin-master-shell-data-v1"],
  { revalidate: 15 }
);

export async function getAdminMasterShellDataCached() {
  return getCachedShellData();
}
