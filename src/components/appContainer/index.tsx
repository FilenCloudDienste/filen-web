import RequireAuth from "../requireAuth"
import { memo } from "react"

export const AppContainer = memo(({ children }: { children: React.ReactNode }) => {
	return <RequireAuth>{children}</RequireAuth>
})

export default AppContainer
