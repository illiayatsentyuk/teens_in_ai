import { Injectable } from '@nestjs/common';
import AnalizeImagesDto from './dto/analize-images.dto';
import { OpenAIService } from '../openai/openai.service';
import GenerateSentenceDto from './dto/generate-sentence.dto';

@Injectable()
export class PerekladonService {
    constructor(private readonly openaiService: OpenAIService){}
    async sendImage(dto: AnalizeImagesDto){
        return this.openaiService.analyzeImage(dto);
    }

    async generateSentence(dto: GenerateSentenceDto){
        return this.openaiService.generateSentence(dto);
    }
}
