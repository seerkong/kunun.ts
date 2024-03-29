import { FormatConfig } from "./FormatConfig";

export class FormatState {
  public IndentLevel : number = 0;
  public Config : FormatConfig;

  constructor(indentLevel = 0, config : FormatConfig = FormatConfig.SingleLineConfig) {
    this.IndentLevel = indentLevel;
    this.Config = config;
  }
}