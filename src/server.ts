import { App } from '@/app';
import { TrackRoute } from '@routes/track.route';

const app = new App([new TrackRoute()]);

app.listen();
