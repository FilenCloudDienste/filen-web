import * as React from "react"
import { ArchiveX, Command, File, Inbox, Send, Trash2, Folder, ChevronRight } from "lucide-react"
import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInput,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarGroupLabel,
	useSidebar
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useTranslation } from "react-i18next"

// This is sample data
const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg"
	},
	navMain: [
		{
			title: "Inbox",
			url: "#",
			icon: Inbox,
			isActive: true
		},
		{
			title: "Drafts",
			url: "#",
			icon: File,
			isActive: false
		},
		{
			title: "Sent",
			url: "#",
			icon: Send,
			isActive: false
		},
		{
			title: "Junk",
			url: "#",
			icon: ArchiveX,
			isActive: false
		},
		{
			title: "Trash",
			url: "#",
			icon: Trash2,
			isActive: false
		}
	],
	tree: [
		["app", ["api", ["hello", ["route.ts"]], "page.tsx", "layout.tsx", ["blog", ["page.tsx"]]]],
		[
			"components",
			[
				"ui",
				"button.tsx",
				"card.tsx",
				[
					"foo",
					"bar",
					["foo", "bar", ["foo", "bar", ["foo", "bar", ["foo", "bar", ["foo", "bar", ["foo", "bar", ["foo", "bar"]]]]]]]
				]
			],
			"header.tsx",
			"footer.tsx"
		],
		["lib", ["util.ts"]],
		["public", "favicon.ico", "vercel.svg"],
		".eslintrc.json",
		".gitignore",
		"next.config.js",
		"tailwind.config.js",
		"package.json",
		"README.md"
	]
}

type FileTreeNode = string | FileTreeNode[]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	// Note: I'm using state to show active item.
	// IRL you should use the url/router.
	const [activeItem, setActiveItem] = React.useState(data.navMain[0])
	const { setOpen } = useSidebar()
	const { t } = useTranslation()

	return (
		<Sidebar
			collapsible="offcanvas"
			className="overflow-x-hidden *:data-[sidebar=sidebar]:flex-row p-0"
			variant="inset"
			{...props}
		>
			{/* This is the first sidebar */}
			{/* We disable collapsible and adjust width to icon. */}
			{/* This will make the sidebar appear as icons. */}
			<Sidebar
				collapsible="none"
				className="w-[calc(var(--sidebar-width-icon)+1px)]! overflow-x-hidden p-2 border-r"
			>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								size="lg"
								asChild
								className="md:h-8 md:p-0"
							>
								<a href="#">
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<Command className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">Acme Inc</span>
										<span className="truncate text-xs">Enterprise</span>
									</div>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent className="px-1.5 md:px-0">
							<SidebarMenu>
								{data.navMain.map(item => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											tooltip={{
												children: item.title,
												hidden: false
											}}
											onClick={() => {
												setActiveItem(item)
												setOpen(true)
											}}
											isActive={activeItem?.title === item.title}
											className="px-2.5 md:px-2"
										>
											<item.icon />
											<span>{item.title}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter>
					<NavUser user={data.user} />
				</SidebarFooter>
			</Sidebar>

			<Sidebar
				collapsible="none"
				className="hidden flex-1 md:flex overflow-x-hidden"
			>
				<SidebarHeader className="gap-3.5 p-4">
					<div className="flex w-full items-center justify-between">
						<div className="text-foreground text-base font-medium">{activeItem?.title}</div>
						<Label className="flex items-center gap-2 text-sm">
							<span>Unreads</span>
							<Switch className="shadow-none" />
						</Label>
					</div>
					<SidebarInput placeholder="Search..." />
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroup className="overflow-x-hidden">
						<SidebarGroupLabel>{t("cloudDrive")}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{data.tree.map((node, index) => (
									<Tree
										key={index}
										node={node}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	)
}

function Tree({ node }: { node: FileTreeNode }) {
	const [name, ...nodes] = Array.isArray(node) ? node : [node]

	if (!nodes.length) {
		return (
			<SidebarMenuButton
				isActive={name === "button.tsx"}
				className="data-[active=true]:bg-transparent"
			>
				<File />
				{name}
			</SidebarMenuButton>
		)
	}

	return (
		<SidebarMenuItem>
			<Collapsible
				className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
				defaultOpen={name === "components" || name === "ui"}
				style={{
					width: "calc(var(--sidebar-width) - var(--sidebar-width-icon) - 50px)"
				}}
			>
				<CollapsibleTrigger asChild={true}>
					<SidebarMenuButton>
						<ChevronRight className="transition-transform" />
						<Folder />
						{name}
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{nodes.map((subNode, index) => (
							<Tree
								key={index}
								node={subNode}
							/>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuItem>
	)
}
