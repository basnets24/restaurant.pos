import HomeView from "@/components/HomeView";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function HomePage() {
  useDocumentTitle("Home · Spoontab");
  return <HomeView />;
}
