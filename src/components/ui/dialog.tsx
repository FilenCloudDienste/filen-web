import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = React.memo(DialogPrimitive.Root)

const DialogTrigger = React.memo(DialogPrimitive.Trigger)

const DialogPortal = React.memo(DialogPrimitive.Portal)

const DialogClose = React.memo(DialogPrimitive.Close)

const DialogOverlay = React.memo(
	React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
		({ className, ...props }, ref) => (
			<DialogPrimitive.Overlay
				ref={ref}
				className={cn(
					"fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
					className
				)}
				{...props}
			/>
		)
	)
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.memo(
	React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
		({ className, children, ...props }, ref) => (
			<DialogPortal>
				<DialogOverlay />
				<DialogPrimitive.Content
					ref={ref}
					className={cn(
						"fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
						className,
						className?.includes("fullscreen-dialog")
							? "w-screen h-[100dvh]"
							: "max-w-lg border p-6 duration-200 sm:rounded-lg gap-4 shadow-lg grid"
					)}
					{...props}
				>
					{children}
					<DialogPrimitive.Close
						className={cn(
							"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
							className?.includes("no-close-button") && "hidden"
						)}
					>
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				</DialogPrimitive.Content>
			</DialogPortal>
		)
	)
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = React.memo(({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
		{...props}
	/>
))
DialogHeader.displayName = "DialogHeader"

const DialogFooter = React.memo(({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
		{...props}
	/>
))
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.memo(
	React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
		({ className, ...props }, ref) => (
			<DialogPrimitive.Title
				ref={ref}
				className={cn("text-lg font-semibold leading-none tracking-tight", className)}
				{...props}
			/>
		)
	)
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.memo(
	React.forwardRef<
		React.ElementRef<typeof DialogPrimitive.Description>,
		React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
	>(({ className, ...props }, ref) => (
		<DialogPrimitive.Description
			ref={ref}
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	))
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogClose,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription
}
