import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8 text-orange-400">R10 STUDIO</h1>
        <h2 className="text-2xl mb-12">3 Ferramentas em 1</h2>
        <div className="flex gap-4 justify-center">
          <Button asChild className="bg-blue-600">
            <Link to="/video-slide">VideoSlide</Link>
          </Button>
          <Button asChild className="bg-green-600">
            <Link to="/video-editor">VideoEditor</Link>
          </Button>
          <Button asChild className="bg-orange-600">
            <Link to="/card-maker">CardMaker</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;