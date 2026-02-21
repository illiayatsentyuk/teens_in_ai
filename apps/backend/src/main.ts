import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';

async function bootstrap() {
  const bodyLimit = process.env['BODY_LIMIT'] ?? '20mb';
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: bodyLimit }));
  expressApp.use(express.urlencoded({ limit: bodyLimit, extended: true }));
  app.enableCors();
  
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
