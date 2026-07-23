import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AboutPage } from './pages/AboutPage';
import { AILabPage } from './pages/AILabPage';
import { AnimeArchivePage } from './pages/AnimeArchivePage';
import { AnimeDetailPage } from './pages/AnimeDetailPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { CalendarPage } from './pages/CalendarPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RadarPage } from './pages/RadarPage';
import { SeasonDetailPage } from './pages/SeasonDetailPage';
import { SeasonsPage } from './pages/SeasonsPage';
import { WorkDetailPage } from './pages/WorkDetailPage';
import { WorksPage } from './pages/WorksPage';
import { AnimeDataProvider } from './liveAnime';
import { LocalLibraryProvider } from './localLibrary';

export default function App() {
  return (
    <AnimeDataProvider>
      <LocalLibraryProvider>
        <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/radar" element={<RadarPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/seasons" element={<SeasonsPage />} />
          <Route path="/season/:year/:season" element={<SeasonDetailPage />} />
          <Route path="/anime" element={<AnimeArchivePage />} />
          <Route path="/anime/:id" element={<AnimeDetailPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/ai-lab" element={<AILabPage />} />
          <Route path="/works" element={<WorksPage />} />
          <Route path="/works/:id" element={<WorkDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Layout>
      </LocalLibraryProvider>
    </AnimeDataProvider>
  );
}
