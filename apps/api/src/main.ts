import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

/** Local dev ports for the web app; deployments set CORS_ORIGIN explicitly. */
const DEV_ORIGINS = ['http://localhost:3005', 'http://localhost:5173'];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const production = config.get<string>('NODE_ENV') === 'production';

  app.disable('x-powered-by');
  app.use(helmet());
  app.useBodyParser('json', { limit: '256kb' });

  const configured = config.get<string>('CORS_ORIGIN');
  if (production && !configured) throw new Error('CORS_ORIGIN must be set in production.');
  const origin = configured ? configured.split(',').map((o) => o.trim()) : DEV_ORIGINS;
  app.enableCors({ origin, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (config.get<string>('SWAGGER_ENABLED') !== 'false') {
    const swagger = new DocumentBuilder()
      .setTitle('BizzNex API')
      .setDescription('Business management suite: projects, tasks, CRM, marketing tools, onboarding and account')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));
  }

  const port = Number(config.get('PORT') ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`BizzNex API listening on http://localhost:${port} (docs: /docs)`);
}

void bootstrap();
