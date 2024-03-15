import { type Prettify } from "@/types"
import { type DriveCloudItem } from "@/components/drive"

export type DriveCloudItemWithPath = Prettify<DriveCloudItem & { path: string }>

export type WorkerToMainMessage = {
	type: "download" | "upload"
	data: { uuid: string; name: string; size: number } & (
		| {
				type: "started"
		  }
		| {
				type: "queued"
		  }
		| {
				type: "finished"
		  }
		| {
				type: "progress"
				bytes: number
		  }
		| {
				type: "error"
				err: Error
		  }
	)
}
