import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import AnalizeImagesDto from '../perekladon/dto/analize-images.dto';
import GenerateSentenceDto from '../perekladon/dto/generate-sentence.dto';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeImage(body: AnalizeImagesDto) {
    const { image, langFrom, langTo, dots } = body;
    const pointsDescription = dots.map((d, i) => `Point ${i + 1}: X:${d.x}%, Y:${d.y}%`).join('; ');
    const promptText = `The user marked ${dots.length} point(s) on this image at the following coordinates (percentage of image width and height): ${pointsDescription}.

    For each marked point:
    1. Identify the visible element at that location (object, text, region of interest).
    2. Stroke (outline) that element — i.e. define its boundary.
    3. Return the coordinates of that stroke for each element.
    
    Provide your response as JSON with an "elements" array. Each element must have:
    - "textFrom": name or description in ${langFrom}
    - "textTo": name or description in ${langTo}
    - "bbox": [ymin, xmin, ymax, xmax] — the bounding box of the stroked outline, in 0–1000 scale (e.g. 0,0 = top-left, 1000,1000 = bottom-right of the image).
    
    If there is only one point, you may instead return a single object with "textFrom", "textTo", and "bbox" at the top level for backward compatibility.
    Respond ONLY with the JSON object, no other text.`

    const chatCompletion = await this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [{
            role: 'user',
            content: [
                { type: 'text', text: promptText },
                { type: 'image_url', image_url: { url: image } }
            ]
        }],
        response_format: { type: "json_object" }
    })
    console.log(chatCompletion);
    return chatCompletion.choices[0].message.content;
  }

  async generateSentence(body: GenerateSentenceDto){
    const chatCompletion = await this.openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: `Generate sentence with first word(if you detect that language is not ukrainian, 
          translate it to english): ${body.words[0]} and translate it to language on which this word is 
          written(if you detect that language is not english, translate it to ukrainian): ${body.words[1]}. 
          Respond ONLY with the JSON object, no other text. 
          Response should be like this: {"sentence":"sentence", "translatedSentence":"translatedSentence"}. 
          TranslatedSentence should be laguage on which second word was writtern.` }]
      }],
      response_format: { type: "json_object" }
    })
    const result = JSON.parse(chatCompletion.choices[0].message.content || '{}');
    return result;
  }
}