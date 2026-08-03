export interface LoginActionState {
  readonly status: "IDLE" | "ERROR"
  readonly message: string | null
  readonly fieldErrors?: Readonly<Record<"email" | "password", readonly string[]>>
}

export const initialLoginState: LoginActionState = {
  status: "IDLE",
  message: null,
}
