import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

export default class GenerateSentenceDto {
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsString({ each: true })
    words: string[];
}