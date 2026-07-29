import { cookies } from "next/headers"

export const ACTIVE_GARAGE_COOKIE = "garage_os_active_garage"

export async function readActiveGarageCookie() {
  return (await cookies()).get(ACTIVE_GARAGE_COOKIE)?.value ?? null
}

export async function persistActiveGarageCookie(garageId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_GARAGE_COOKIE, garageId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}
