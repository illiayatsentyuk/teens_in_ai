import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { OpenAIService } from 'src/openai/openai.service';

@Module({
  providers: [ImagesService, OpenAIService],
  controllers: [ImagesController]
})
export class ImagesModule {}
