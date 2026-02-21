import { Injectable } from '@nestjs/common';
import AnalizeImagesDto from './dto/analize-images.dto';
import { OpenAIService } from 'src/openai/openai.service';

@Injectable()
export class ImagesService {
    constructor(private readonly openaiService: OpenAIService){}
    async sendImage(dto: AnalizeImagesDto){
        return this.openaiService.analyzeImage(dto);
    }
}
