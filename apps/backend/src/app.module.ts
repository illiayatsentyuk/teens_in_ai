import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PerekladonModule } from './perekladon/perekladon.module';
import { OpenAIService } from './openai/openai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PerekladonModule,
  ],
  controllers: [AppController],
  providers: [AppService, OpenAIService],
})
export class AppModule {}
