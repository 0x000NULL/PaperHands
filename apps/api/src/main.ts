import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AppDataSource } from './data-source';

async function runMigrations() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Running database migrations...');
    try {
      await AppDataSource.initialize();
      await AppDataSource.runMigrations();
      console.log('Migrations completed successfully');
      await AppDataSource.destroy();
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't throw - let the app continue and TypeORM will handle it
    }
  }
}

async function bootstrap() {
  // Run migrations before starting the app in production
  await runMigrations();

  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Validate FRONTEND_URL in production
  const frontendUrl = process.env.FRONTEND_URL;
  if (process.env.NODE_ENV === 'production' && !frontendUrl) {
    throw new Error(
      'FRONTEND_URL environment variable is required in production',
    );
  }

  // Enable CORS
  app.enableCors({
    origin: frontendUrl || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable class-transformer serialization (for @Exclude)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
