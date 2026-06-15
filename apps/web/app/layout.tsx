import { APP_NAME } from "@ai-code-review/shared";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: APP_NAME,
	description: "Phase 0 foundation for the context-aware AI code review bot.",
};

type RootLayoutProps = {
	children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
