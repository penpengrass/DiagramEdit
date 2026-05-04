/**
 * 互換層：parsers/oudParser.ts にコードが移動されました
 * 既存の外部参照との互換性のため、ここで re-export します
 */
import { importStations as importStationsImpl } from "./parsers/oudParser.js";

export const importStations = importStationsImpl;