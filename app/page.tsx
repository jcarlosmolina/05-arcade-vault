import HomeView from "@/components/HomeView";
import { getGames } from "@/app/lib/games";

export default async function Home() {
  const games = await getGames();
  return <HomeView games={games} />;
}
