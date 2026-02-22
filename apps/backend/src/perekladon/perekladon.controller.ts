import { Body, Controller, Post } from '@nestjs/common';
import { PerekladonService } from './perekladon.service';
import AnalizeImagesDto from './dto/analize-images.dto';
import GenerateSentenceDto from './dto/generate-sentence.dto';

@Controller('')
export class PerekladonController {

    constructor(private readonly perekladonService: PerekladonService){}

    @Post("/send")
    sendImage(@Body() body: AnalizeImagesDto){
        return this.perekladonService.sendImage(body);
    }

    @Post("/sentence")
    generateSentence(@Body() body: GenerateSentenceDto){
        return this.perekladonService.generateSentence(body);
    }
}
