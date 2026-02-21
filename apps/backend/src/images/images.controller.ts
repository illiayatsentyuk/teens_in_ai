import { Controller, Post } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { ImagesService } from './images.service';
import AnalizeImagesDto from './dto/analize-images.dto';

@Controller('images')
export class ImagesController {

    constructor(private readonly imagesService: ImagesService){}

    @Post("/send")
    sendImage(@Body() body: AnalizeImagesDto){
        return this.imagesService.sendImage(body);
    }
}
