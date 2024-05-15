import { memo, useCallback, useState, useEffect } from "react"
import useAccount from "@/hooks/useAccount"
import Section from "../section"
import useLoadingToast from "@/hooks/useLoadingToast"
import useErrorToast from "@/hooks/useErrorToast"
import worker from "@/lib/worker"
import { showSaveFilePicker } from "native-file-system-adapter"
import { Switch } from "@/components/ui/switch"
import { formatBytes } from "@/utils"
import { showConfirmDialog } from "@/components/dialogs/confirm"
import { showTwoFactorCodeDialog } from "@/components/dialogs/twoFactorCodeDialog"
import { transfer } from "comlink"
import Avatar from "@/components/avatar"
import { showInputDialog } from "@/components/dialogs/input"
import ChangeEmailDialog from "./dialogs/changeEmail"
import eventEmitter from "@/lib/eventEmitter"
import ChangePersonalInformationDialog from "./dialogs/personalInformation"
import useIsMobile from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"

export const Account = memo(() => {
	const account = useAccount()
	const loadingToast = useLoadingToast()
	const errorToast = useErrorToast()
	const isMobile = useIsMobile()
	const [usage, setUsage] = useState<{ all: number; versioned: number }>(
		account
			? {
					all: account.account.storage,
					versioned: account.settings.versionedStorage
				}
			: {
					all: 0,
					versioned: 0
				}
	)

	const requestAccountData = useCallback(async () => {
		if (!account) {
			return
		}

		try {
			const fileHandle = await showSaveFilePicker({
				suggestedName: `${account.account.email}.data.json`
			})
			const writer = await fileHandle.createWritable()

			const toast = loadingToast()

			try {
				const gdpr = await worker.requestAccountData()

				await writer.write(JSON.stringify(gdpr, null, 4))
				await writer.close()
			} catch (e) {
				console.error(e)

				if (!(e as unknown as Error).toString().includes("abort")) {
					const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

					toast.update({
						id: toast.id,
						duration: 5000
					})
				}
			} finally {
				toast.dismiss()
			}
		} catch (e) {
			console.error(e)

			if (!(e as unknown as Error).toString().includes("abort")) {
				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			}
		} finally {
			const input = document.getElementById("avatar-input") as HTMLInputElement

			input.value = ""
		}
	}, [loadingToast, errorToast, account])

	const deleteVersioned = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.deleteAllVersionedFiles()

			setUsage(prev => ({
				...prev,
				versioned: 0
			}))
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast])

	const deleteAll = useCallback(async () => {
		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.deleteEverything()

			setUsage({
				all: 0,
				versioned: 0
			})
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast])

	const onVersioningChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.toggleFileVersioning({ enabled: checked })
				await account.refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account]
	)

	const onLoginAlertsChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.toggleLoginAlerts({ enabled: checked })
				await account.refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account]
	)

	const onAppearOfflineChange = useCallback(
		async (checked: boolean) => {
			if (!account) {
				return
			}

			const toast = loadingToast()

			try {
				await worker.appearOffline({ enabled: checked })
				await account.refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()
			}
		},
		[loadingToast, errorToast, account]
	)

	const requestAccountDeletion = useCallback(async () => {
		if (!account) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		if (
			!(await showConfirmDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			}))
		) {
			return
		}

		let twoFactorCode: string | undefined = undefined

		if (account.settings.twoFactorEnabled) {
			const code = await showTwoFactorCodeDialog({
				title: "d",
				continueButtonText: "ddd",
				description: "ookeoetrasher",
				continueButtonVariant: "destructive"
			})

			if (code.cancelled) {
				twoFactorCode = ""
			} else {
				twoFactorCode = code.code
			}
		}

		const toast = loadingToast()

		try {
			await worker.requestAccountDeletion(twoFactorCode ? { twoFactorCode } : {})
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, account])

	const uploadAvatar = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files || e.target.files.length !== 1 || !account) {
				return
			}

			const toast = loadingToast()

			try {
				const file = e.target.files[0]
				const buffer = Buffer.from(await file.arrayBuffer())

				await worker.uploadAvatar({ buffer: transfer(buffer, [buffer.buffer]) })
				await account.refetch()
			} catch (e) {
				console.error(e)

				const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

				toast.update({
					id: toast.id,
					duration: 5000
				})
			} finally {
				toast.dismiss()

				const input = document.getElementById("avatar-input") as HTMLInputElement

				input.value = ""
			}
		},
		[loadingToast, errorToast, account]
	)

	const changeNickname = useCallback(async () => {
		if (!account) {
			return
		}

		const inputResponse = await showInputDialog({
			title: "newfolder",
			continueButtonText: "create",
			value: account.account.nickName,
			autoFocusInput: true,
			placeholder: "New folder"
		})

		if (inputResponse.cancelled) {
			return
		}

		const toast = loadingToast()

		try {
			await worker.changeNickname({ nickname: inputResponse.value.trim() })
			await account.refetch()
		} catch (e) {
			console.error(e)

			const toast = errorToast((e as unknown as Error).message ?? (e as unknown as Error).toString())

			toast.update({
				id: toast.id,
				duration: 5000
			})
		} finally {
			toast.dismiss()
		}
	}, [loadingToast, errorToast, account])

	const changeEmail = useCallback(() => {
		eventEmitter.emit("openChangeEmailDialog")
	}, [])

	const changePersonalInformation = useCallback(() => {
		eventEmitter.emit("openChangePersonalInformationDialog")
	}, [])

	useEffect(() => {
		if (account) {
			setUsage({
				all: account.account.storage,
				versioned: account.settings.versionedStorage
			})
		}
	}, [account])

	if (!account) {
		return null
	}

	return (
		<>
			<div className="flex flex-col w-full h-screen overflow-y-auto overflow-x-hidden">
				<div className={cn("flex flex-col p-6 h-full", isMobile ? "w-full" : "w-4/6")}>
					<div className="flex flex-col gap-4">
						<Section
							name="Avatar"
							info="Your avatar will be visible publicly"
						>
							<Avatar
								src={account.account.avatarURL}
								size={32}
							/>
							<p
								className="underline cursor-pointer"
								onClick={() => document.getElementById("avatar-input")?.click()}
							>
								Edit
							</p>
						</Section>
						<Section
							name="Versioned files"
							info="Delete all versioned files"
							className="mt-10"
						>
							<p className="text-muted-foreground">{formatBytes(usage.versioned)}</p>
							<p
								className="underline cursor-pointer"
								onClick={deleteVersioned}
							>
								Delete
							</p>
						</Section>
						<Section
							name="All files and directories"
							info="Delete all files and folders"
						>
							<p className="text-muted-foreground">{formatBytes(usage.all)}</p>
							<p
								className="underline cursor-pointer"
								onClick={deleteAll}
							>
								Delete
							</p>
						</Section>
						<Section
							name="Email address"
							info="Change your email address"
							className="mt-10"
						>
							<p className="text-muted-foreground">{account.account.email}</p>
							<p
								className="underline cursor-pointer"
								onClick={changeEmail}
							>
								Edit
							</p>
						</Section>
						<Section
							name="Nickname"
							info="Change your nickname"
						>
							{account.account.nickName.length > 0 && <p className="text-muted-foreground">{account.account.nickName}</p>}
							<p
								className="underline cursor-pointer"
								onClick={changeNickname}
							>
								Edit
							</p>
						</Section>
						<Section
							name="Personal information"
							info="Edit your personal information. Will be used for invoicing and is not public"
						>
							<p
								className="underline cursor-pointer"
								onClick={changePersonalInformation}
							>
								Edit
							</p>
						</Section>
						<Section
							name="File versioning"
							info="Enable or disable file versioning"
							className="mt-10"
						>
							<Switch
								checked={account.settings.versioningEnabled}
								onCheckedChange={onVersioningChange}
							/>
						</Section>
						<Section
							name="Login alerts"
							info="Enable or disable login alerts"
						>
							<Switch
								checked={account.settings.loginAlertsEnabled}
								onCheckedChange={onLoginAlertsChange}
							/>
						</Section>
						<Section
							name="Appear offline"
							info="Appear offline in chats"
						>
							<Switch
								checked={account.account.appearOffline}
								onCheckedChange={onAppearOfflineChange}
							/>
						</Section>
						<Section
							name="Request account data"
							info="Request all personal data we store according to GDPR"
							className="mt-10"
						>
							<p
								className="underline cursor-pointer"
								onClick={requestAccountData}
							>
								Request
							</p>
						</Section>
						<Section
							name="Request account deletion"
							info="Request deletion of your account. We will send you a confirmation email"
							className="mt-10"
						>
							<p
								className="underline cursor-pointer text-red-500"
								onClick={requestAccountDeletion}
							>
								Delete
							</p>
						</Section>
						<div className="w-full h-20" />
					</div>
				</div>
			</div>
			<input
				className="hidden"
				id="avatar-input"
				onChange={uploadAvatar}
				type="file"
				accept="image/png, image/jpeg, image/jpg"
			/>
			<ChangeEmailDialog />
			<ChangePersonalInformationDialog account={account.account} />
		</>
	)
})

export default Account
