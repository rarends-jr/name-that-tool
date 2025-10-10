import cron from 'node-cron';
import { runGames } from './runGames';

cron.schedule('* * * * *', () => {
  runGames();
});