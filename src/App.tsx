import { Routes, Route, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Index from "@/pages/Index";
import Videos from "@/pages/Videos";
import NotFound from "@/pages/NotFound";
import VideoSlidePage from "@/modules/video-slide/VideoSlidePage";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import RequireAuth from "@/auth/RequireAuth";
import LoginPage from "@/auth/LoginPage";

export default function App() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Header />
			<main className="py-6">
				<Routes>
					<Route path="/" element={<LoginPage />} />
					<Route path="/videos" element={<Videos />} />
					{/* Editor principal: apenas SlidePage */}
					<Route path="/video-slide" element={<RequireAuth><VideoSlidePage /></RequireAuth>} />
					{/* Redirects antigos (se existirem bookmarks) */}
					<Route path="/video/novo" element={<Navigate to="/video-slide" replace />} />
					<Route path="*" element={<NotFound />} />
				</Routes>
			</main>
			<SonnerToaster position="top-right" richColors />
		</div>
	);
}

