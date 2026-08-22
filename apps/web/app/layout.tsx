import { APP_NAME } from "@ai-code-review/shared";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
	title: APP_NAME,
	description:
		"PullSense dashboard for AI review status, GitHub artifacts, and run diagnostics.",
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
