import { IsArray, IsString, IsObject } from "class-validator";


export default class AnalizeImagesDto {
    @IsString()
    image: string;
    @IsString()
    langFrom: string;
    @IsString()
    langTo: string;
    @IsArray()
    @IsObject({ each: true })
    dots: { x: number; y: number }[];
}