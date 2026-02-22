import { IsArray, IsString } from "class-validator";

export default class GenerateSentenceDto {
    @IsArray()
    @IsString({ each: true })
    words: string[];
}