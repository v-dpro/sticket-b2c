import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import artistRoutes from './artists';
import venueRoutes from './venues';
import eventRoutes from './events';
import logRoutes from './logs';
import discoverRoutes from './discover';
import feedRoutes from './feed';
import ticketRoutes from './tickets';
import notificationRoutes from './notifications';
import searchRoutes from './search';
import uploadRoutes from './upload';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/artists', artistRoutes);
router.use('/venues', venueRoutes);
router.use('/events', eventRoutes);
router.use('/logs', logRoutes);
router.use('/discover', discoverRoutes);
router.use('/feed', feedRoutes);
router.use('/tickets', ticketRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/upload', uploadRoutes);

export default router;



