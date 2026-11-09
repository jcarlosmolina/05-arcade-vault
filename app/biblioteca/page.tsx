import BibliotecaView from '@/components/BibliotecaView';
import { getGames } from '@/app/lib/games';

export default async function BibliotecaPage() {
  const games = await getGames();
  return <BibliotecaView games={games} />;
}
