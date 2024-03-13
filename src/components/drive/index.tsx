import MainContainer from "@/components/mainContainer"
import RequireAuth from "@/components/requireAuthed"
import { memo } from "react"
import { type CloudItem, type CloudItemShared } from "@filen/sdk"
import List from "./list"
import Header from "./list/header"
import { type Prettify } from "@/types"

export type DriveCloudItem = Prettify<
	CloudItem &
		CloudItemShared & {
			selected: boolean
		}
>

export const Drive = memo(() => {
	return (
		<RequireAuth>
			<MainContainer>
				<div className="w-full h-full flex flex-col">
					<Header />
					<List />
				</div>
			</MainContainer>
		</RequireAuth>
	)
})

export default Drive
