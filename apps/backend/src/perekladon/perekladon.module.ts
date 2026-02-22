import { Module } from '@nestjs/common';
import { PerekladonService } from './perekladon.service';
import { PerekladonController } from './perekladon.controller';
import { OpenAIService } from '../openai/openai.service';

@Module({
  providers: [PerekladonService, OpenAIService],
  controllers: [PerekladonController]
})
export class PerekladonModule {}
