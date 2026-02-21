import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImagesModule } from './images/images.module';
import { OpenAIService } from './openai/openai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ImagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, OpenAIService],
})
export class AppModule {}
