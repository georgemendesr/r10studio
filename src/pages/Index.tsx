import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
	// Redireciona diretamente para o editor para otimizar cliques
	return <Navigate to="/video-slide" replace />;

	/* Layout antigo mantido caso queira reativar como landing
	return (
		<main className="min-h-[calc(100vh-4rem)] bg-background">
			<section className="container mx-auto px-4 py-16 grid gap-10 lg:grid-cols-2 items-center">
						<div className="space-y-6">
							  <h1 className="sr-only">R10 STUDIO</h1>
										<img
											src="/logor10studiob.png"
											alt="R10 STUDIO"
											className="h-16 md:h-20 w-auto select-none drop-shadow-sm"
											loading="eager"
											decoding="sync"
											draggable={false}
										/>
					<p className="text-lg text-muted-foreground">
						Crie vídeos com efeito punch zoom: importe imagens, adicione legenda no padrão visual (fundo vermelho, texto branco, Poppins) e gere MP4/WebM a 30fps.
					</p>
					<div className="flex gap-3">
						<Button asChild size="lg" variant="accent">
							<Link to="/video-slide">Começar agora</Link>
						</Button>
						<Button asChild size="lg" variant="outline">
							<Link to="/videos">Ver meus vídeos</Link>
						</Button>
					</div>
				</div>
				<div className="rounded-xl border bg-card p-6 shadow-sm">
					<div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
						Prévia do editor de slides
					</div>
					<ul className="mt-6 space-y-2 text-sm text-muted-foreground">
						<li>• Zoom seco por etapas (30 fps)</li>
						<li>• Legenda com efeito digitando e barra vermelha por linha</li>
						<li>• Alinhamento da imagem (H/V), fade/flash, marca d’água</li>
						<li>• Exportação priorizando H.264 (MP4) a 8 Mbps</li>
					</ul>
				</div>
			</section>
		</main>
	);
	*/
};

export default Index;

